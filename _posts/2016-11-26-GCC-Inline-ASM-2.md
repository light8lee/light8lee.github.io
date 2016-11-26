---
layout: post
title: gcc内联汇编（二）
date: 2016-11-26 13:25
category: "Operating-System"
---

### 前言
今天继续昨天没讲完的内容，GCC内联汇编的使用。

### 发展
先拿一个最简单的来试试手吧，
{% highlight c %}
int main()
{
    __asm__ ("movl %eax, %ebx");
    return 0;
}
{% endhighlight %}
把这段函数保存到*asm.c*中，然后在当前目录下执行

```shell
gcc asm.c -S -O0 -m32
```

简单讲下这个gcc命令，gcc会以**asm.c**作为输入，**-S**指定输出为汇编代码文件，**-O**指定优化程度，因为gcc默认会以**-O3**作为优化程度，这里指定0级优化程度，也就是不优化，方便更加直观地看到C翻译成汇编的代码，因为我主要讲的是32位汇编，所以用**-m32**指定生成32位汇编代码。执行好这条命令之后，你会看到当前目录下多了一个**asm.s**文件，这就是生成的汇编文件。
我们打开这个文件，会看到很多以点*.*开头的标识，这些都是伪操作，给编译器看的不会生成机器码，我们可以不去看这东西，剩下来的就是真正的汇编代码了，

```asm
main:
	pushl	%ebp
	movl	%esp, %ebp
#APP
# 3 "asm.c" 1
	movl %eax, %ebx
# 0 "" 2
#NO_APP
	movl	$0, %eax
	popl	%ebp
	ret
```

可以看到，我们写在main函数中的内联汇编代码原模原样地被放在*#APP*和*#NO_APP*之间，很简单吧。
其实也可以一次写多条汇编代码。

```c
__asm__ (
        "movw %ax, %bx\n\t"
        "xor %ax, %ax\n\t"
        "add $3, %ax\n\t"
        );
```

对应的汇编代码就变成

```asm
#APP
# 4 "asm.c" 1
	movw %ax, %bx
	xor %ax, %ax
	add $3, %ax
# 0 "" 2
#NO_APP
```

内联汇编中写的**\n\t**是用来分割多条汇编代码，你也可以使用分号**;**来代替。
基本的内联汇编格式就是**__asm__ __volatile__ ("Instruction List");**，其中Instruction List 的内容和你写普通的汇编没什么区别，你同样可以定义伪操作这些东西。**__volatile__**是可选的，使用了这个就相当于告诉GCC不要动我写的Instruction List，否则GCC可能会对其进行优化处理。
那么怎样可以把C的变量和汇编联系起来呢？毕竟内联汇编只是用来辅助的，不可能所有都拿汇编来写，所以就会有下面这个进阶版C/C++版内联汇编表达方式：

```c
__asm__ __volatile__ ("Instruction List"
                 : Output           /* optional */
                 : Input            /* optional */
                 : Clobber/Modify   /* optional */
                 );
```

同样还是举个例子：

```c
int rv, foo = 4;
__asm__ __volatile__ (
        "mov %%ecx, %%eax\n\t"
        "mov %%eax, %%ebx"
        : "=b" (rv)
        : "c" (foo)
        : "eax"
        );

int endlow, endhigh, startlow, starthigh;
__asm__ (
		"subl %2, %0\n\t"
        "sbbl %3, %1"
        : "=a" (endlow), "=d" (endhigh)
        : "r" (startlow), "r" (starthigh),
          "0" (endlow), "1" (endhigh)
        );
```

规则如下：

- 如果Clobber/Modify为空，则其前面的冒号必须省略
- 如果Instruction List为空，则Input、Output和Clobber/Modify可以为空也可以不为空
- 如果Input、Output和Clobber/Modify都为空，Input和Output前的空格可以省略，如果都省略则退化成基本内联汇编，否则仍然是一个C/C++表达式的内联汇编，Instruction List中的表达式必须遵守相关规定，例如：寄存器前必须使用两个百分号（%%）。
- 当Input和Clobber/Modify为空，但Output不为空时，Input前的冒号可以省略
- 当前面的部分为空，后面不为空时，前面的冒号必须保留。

冒号后的引号部分称为**操作约束**，下面是相应的约束及其意义。

| 约束 | 意义 |
|:----|:-----|
| r | 代表一个通用寄存器，由GCC在%eax，%ebx，%ax，%al等寄存器中选择合适的 |
| g | 表示使用任意一个寄存器，内存，立即数，由GCC选择所有可用的寄存器中合适的 |
| q | 与r意义相同 |
| a | 表示使用%eax，%ax，%al |
| b | 表示使用%ebx，%bx，%bl |
| c | 表示使用%ecx，%cx，%cl |
| d | 表示使用%edx，%dx，%dl |
| D | 表示使用%edi，%di |
| S | 表示使用%esi，%si |
| f | 表示使用浮点寄存器 |
| t | 表示使用第一个浮点寄存器 |
| u | 表示使用第二个浮点寄存器 |
| i | 表示输入表达式是一个立即数（整数），不需要借助任何寄存器 |
| F | 表示输入表达式是一个立即数（浮点数），不需要借助任何寄存器 |
| m | 表示使用系统所支持的任一内存方式，不需要借助寄存器 |
| 0-9 | 用于Input，表示和第n个操作表达式使用相同的寄存器/内存 |

放在操作约束前的符号称为修饰符，下面是对应的修饰符及其意义

| 修饰符 | 意义 |
|:------|:----|
| = | 用于Output，表示此Output是Write-Only的 |
| + | 用于Output，表示此Output是Read-Write的 |
| & | 用于Output，表示此Output独占其指定的寄存器 |
| % | 用于Input， 表示此Input操作表达式中的C/C++表达式可以与下一个Input中的表达式互换 |

占位符，是放在Instruction List中，用来按出现次序对应一个Input/Output操作表达式，有%0-%9一共十个。
当你需要通知GCC当前内联汇编语句可能会对某些寄存器进行修改，且这些寄存器出现在Instruction List中（直接或间接），但并没有被Input或Output操作表达式指定，也不是在一些Input/Output操作表达式通过**r**或**g**约束由GCC选择。就需要在Clobber/Modify域中指出。当一个内联汇编语句的Clobber/Modify域中存在**memory**，GCC会保证在此内联汇编之前，如果某个内存的内容被装入了寄存器，那么在这个内联汇编之后，如果需要继续使用这个内存处的内容，就会直接从这个内存处重新读取，而不是使用寄存器中的拷贝，因为此时可能已经发生改变。并且如果Instruction List中的指令对内存进行了修改，或者可能发生改变，且改变的内存地址没有在Output操作表达式中使用‘m’约束，这种情况下也需要使用**memory**。

### 结尾
今天讲了很多理论上的，明天将通过Linux中实际代码来做些实践，这里也分享一个链接，大家有什么不懂的也可以参考[这篇文章](http://mp.weixin.qq.com/s/-GaP7k5VNmjErE2r3g7Ppw)。