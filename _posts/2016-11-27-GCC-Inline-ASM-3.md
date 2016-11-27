---
layout: post
title: gcc内联汇编（三）
date: 2016-11-27 19:44
category: "Operating-System"
---

### 前言
啊哈，终于来到实战了！

### 发展
代码总要看最经典的，当之无愧的要属Linux中的代码，而其中**string.h**中的代码更是优雅，让我来一个个欣赏过去（这里使用的Linux v0.11版本内核源码）。
{% highlight c linenos %}
extern inline char * strcpy(char * dest,const char *src)
{
__asm__("cld\n"
	"1:\tlodsb\n\t"
	"stosb\n\t"
	"testb %%al,%%al\n\t"
	"jne 1b"
	::"S" (src),"D" (dest));
return dest;
}
{% endhighlight %}
上面这串代码就是实现字符串拷贝的**strcpy**，它就是用GCC内联汇编写的。让我们简单地一步步分析：
第8行说明，*src*和*dest*分别对应到*%esi*和*%edi*，只有Input，没有Output。

**cld**指令使得之后的地址自动增量。

标号1处，使用lodsb从**(%esi)**处取一个字节放入**%al**中，并且*%esi*增1。

**stosb**从**%al**放一个字节到**(%edi)**，同样使得*%edi*增1。

**testb**判断**%al**是否为0，并根据结果设置标志位。

**jne 1b**表示，当之前**testb**结果使得**ZF=0**（不为零）则跳转到标号1，其中*b*代表backward，向后找标号。

这样，就完成了将字符串从src复制到**(%edi)**dest中。最后return dest。很简洁是不是。
再来看看其他的：
{% highlight c linenos %}
extern inline char * strncpy(char * dest,const char *src,int count)
{
__asm__("cld\n"
	"1:\tdecl %2\n\t"
	"js 2f\n\t"
	"lodsb\n\t"
	"stosb\n\t"
	"testb %%al,%%al\n\t"
	"jne 1b\n\t"
	"rep\n\t"
	"stosb\n"
	"2:"
	::"S" (src),"D" (dest),"c" (count));
return dest;
}
{% endhighlight %}
**strncpy**实现了从src拷贝count个字符到dest中。

13行说明*src*对应*%esi*，*dest*对应*%edi*，*count*对应*%ecx*。

第4行，标号1处，对占位符%2所代表的寄存器（也就是*%ecx*减一），

第5行，如果之前减一的结果为负，则跳转到标号2，这里f代表forward，向前找标号的意思。

6～7行，借助**%al**寄存器从**(%esi)**处拷贝一个字符到**(%edi)**。

8～9行，判断**%al**是否为0，如果不为零则跳转到标号1，否则继续向下运行。

10~11行，在**%al**为零的情况下，通过重复（**rep**）执行**stosb**指令，直到count（**%ecx**）为0，向dest后填充0。

再来看看**strcat**：
{% highlight c linenos %}
extern inline char * strcat(char * dest,const char * src)
{
__asm__("cld\n\t"
	"repne\n\t"
	"scasb\n\t"
	"decl %1\n"
	"1:\tlodsb\n\t"
	"stosb\n\t"
	"testb %%al,%%al\n\t"
	"jne 1b"
	::"S" (src),"D" (dest),"a" (0),"c" (0xffffffff));
return dest;
}
{% endhighlight %}
在这里，Input中指明，*%eax*使用立即数0，*%ecx*使用立即数0xffffffff。

4~5行对src中的串进行扫描，也就是一一与**%eax**（0）进行比较，直到为相等为止（或者**%ecx**减为0）。

第6行，在第5行结束时，**%edi**指向存有0的下一个位置，所以通过减一使其变为指向0的位置。

之后的7~10行和之前的十分类似，这里就不继续讲了。

然后是**strncat**的实现：
{% highlight c linenos %}
extern inline char * strncat(char * dest,const char * src,int count)
{
__asm__("cld\n\t"
	"repne\n\t"
	"scasb\n\t"
	"decl %1\n\t"
	"movl %4,%3\n"
	"1:\tdecl %3\n\t"
	"js 2f\n\t"
	"lodsb\n\t"
	"stosb\n\t"
	"testb %%al,%%al\n\t"
	"jne 1b\n"
	"2:\txorl %2,%2\n\t"
	"stosb"
	::"S" (src),"D" (dest),"a" (0),"c" (0xffffffff),"g" (count)
	);
return dest;
}
{% endhighlight %}
第16行这里指出，有GCC为我们选择count对应的寄存器。

开头的3~6行与之前相同，

第7行，将count值移入**%ecx**，

8~13行也与之前的相同，

14行，标号2处，通过异或操作，将占位符%2对应的寄存器（**%eax**）中的值设置为0，这是为了保证从第9行跳转过来时，通过第15行保证存在一个'\0'作为字符串的结束。

然后是**strcmp**：
{% highlight c linenos %}
extern inline int strcmp(const char * cs,const char * ct)
{
register int __res __asm__("ax");
__asm__("cld\n"
	"1:\tlodsb\n\t"
	"scasb\n\t"
	"jne 2f\n\t"
	"testb %%al,%%al\n\t"
	"jne 1b\n\t"
	"xorl %%eax,%%eax\n\t"
	"jmp 3f\n"
	"2:\tmovl $1,%%eax\n\t"
	"jl 3f\n\t"
	"negl %%eax\n"
	"3:"
	:"=a" (__res):"D" (cs),"S" (ct));
return __res;
}
{% endhighlight %}
这里第3行说明，**__res**是寄存器变量（放在*%eax*中），16行说明**__res**作为输出。

第5行，标号1，从**(%esi)**中读取一个字节到**%al**，

6~7行，将**%al**的值与**(%esi)**中的值进行比较，当不相等时跳转到标号2，

8~9行，判断%al中的值是否为0，不是则跳转到标号1，

10~11行，将%eax中的值设置为0，然后跳转到标号3，

12行，标号2处，设置%eax为1（代表ct中的值大于cs中的值），

13行，根据从第7行跳转过来时，状态字的情况，当ct的值小于cs中的值时，跳转到标号3，

14行，走到这里说明ct中的值大于cs中的值，将%eax中的值求补。

经过之前这么多的讲解，应该基本能看懂GCC内联汇编了，之后的我就不讲了，留作巩固。

```c
extern inline int strncmp(const char * cs,const char * ct,int count)
{
register int __res __asm__("ax");
__asm__("cld\n"
	"1:\tdecl %3\n\t"
	"js 2f\n\t"
	"lodsb\n\t"
	"scasb\n\t"
	"jne 3f\n\t"
	"testb %%al,%%al\n\t"
	"jne 1b\n"
	"2:\txorl %%eax,%%eax\n\t"
	"jmp 4f\n"
	"3:\tmovl $1,%%eax\n\t"
	"jl 4f\n\t"
	"negl %%eax\n"
	"4:"
	:"=a" (__res):"D" (cs),"S" (ct),"c" (count));
return __res;
}

extern inline char * strchr(const char * s,char c)
{
register char * __res;
__asm__("cld\n\t"
	"movb %%al,%%ah\n"
	"1:\tlodsb\n\t"
	"cmpb %%ah,%%al\n\t"
	"je 2f\n\t"
	"testb %%al,%%al\n\t"
	"jne 1b\n\t"
	"movl $1,%1\n"
	"2:\tmovl %1,%0\n\t"
	"decl %0"
	:"=a" (__res):"S" (s),"0" (c));
return __res;
}

extern inline char * strrchr(const char * s,char c)
{
register char * __res;
__asm__("cld\n\t"
	"movb %%al,%%ah\n"
	"1:\tlodsb\n\t"
	"cmpb %%ah,%%al\n\t"
	"jne 2f\n\t"
	"movl %%esi,%0\n\t"
	"decl %0\n"
	"2:\ttestb %%al,%%al\n\t"
	"jne 1b"
	:"=d" (__res):"0" (0),"S" (s),"a" (c));
return __res;
}

extern inline int strspn(const char * cs, const char * ct)
{
register char * __res;
__asm__("cld\n\t"
	"movl %4,%%edi\n\t"
	"repne\n\t"
	"scasb\n\t"
	"notl %%ecx\n\t"
	"decl %%ecx\n\t"
	"movl %%ecx,%%edx\n"
	"1:\tlodsb\n\t"
	"testb %%al,%%al\n\t"
	"je 2f\n\t"
	"movl %4,%%edi\n\t"
	"movl %%edx,%%ecx\n\t"
	"repne\n\t"
	"scasb\n\t"
	"je 1b\n"
	"2:\tdecl %0"
	:"=S" (__res):"a" (0),"c" (0xffffffff),"0" (cs),"g" (ct)
	);
return __res-cs;
}

extern inline int strcspn(const char * cs, const char * ct)
{
register char * __res;
__asm__("cld\n\t"
	"movl %4,%%edi\n\t"
	"repne\n\t"
	"scasb\n\t"
	"notl %%ecx\n\t"
	"decl %%ecx\n\t"
	"movl %%ecx,%%edx\n"
	"1:\tlodsb\n\t"
	"testb %%al,%%al\n\t"
	"je 2f\n\t"
	"movl %4,%%edi\n\t"
	"movl %%edx,%%ecx\n\t"
	"repne\n\t"
	"scasb\n\t"
	"jne 1b\n"
	"2:\tdecl %0"
	:"=S" (__res):"a" (0),"c" (0xffffffff),"0" (cs),"g" (ct)
	);
return __res-cs;
}

extern inline char * strpbrk(const char * cs,const char * ct)
{
register char * __res;
__asm__("cld\n\t"
	"movl %4,%%edi\n\t"
	"repne\n\t"
	"scasb\n\t"
	"notl %%ecx\n\t"
	"decl %%ecx\n\t"
	"movl %%ecx,%%edx\n"
	"1:\tlodsb\n\t"
	"testb %%al,%%al\n\t"
	"je 2f\n\t"
	"movl %4,%%edi\n\t"
	"movl %%edx,%%ecx\n\t"
	"repne\n\t"
	"scasb\n\t"
	"jne 1b\n\t"
	"decl %0\n\t"
	"jmp 3f\n"
	"2:\txorl %0,%0\n"
	"3:"
	:"=S" (__res):"a" (0),"c" (0xffffffff),"0" (cs),"g" (ct)
	);
return __res;
}

extern inline char * strstr(const char * cs,const char * ct)
{
register char * __res;
__asm__("cld\n\t" \
	"movl %4,%%edi\n\t"
	"repne\n\t"
	"scasb\n\t"
	"notl %%ecx\n\t"
	"decl %%ecx\n\t"	/* NOTE! This also sets Z if searchstring='' */
	"movl %%ecx,%%edx\n"
	"1:\tmovl %4,%%edi\n\t"
	"movl %%esi,%%eax\n\t"
	"movl %%edx,%%ecx\n\t"
	"repe\n\t"
	"cmpsb\n\t"
	"je 2f\n\t"		/* also works for empty string, see above */
	"xchgl %%eax,%%esi\n\t"
	"incl %%esi\n\t"
	"cmpb $0,-1(%%eax)\n\t"
	"jne 1b\n\t"
	"xorl %%eax,%%eax\n\t"
	"2:"
	:"=a" (__res):"0" (0),"c" (0xffffffff),"S" (cs),"g" (ct)
	);
return __res;
}

extern inline int strlen(const char * s)
{
register int __res;
__asm__("cld\n\t"
	"repne\n\t"
	"scasb\n\t"
	"notl %0\n\t"
	"decl %0"
	:"=c" (__res):"D" (s),"a" (0),"0" (0xffffffff));
return __res;
}
```

### 结尾
又是收获的一天！