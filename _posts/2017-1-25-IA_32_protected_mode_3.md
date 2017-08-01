---
layout: post
title: IA-32保护模式（3）
date: 2017-1-25 23:09
category: "ASM"
---

### 前言
关于IDT的介绍。

### 正文
在使用lgdt指令设置GDT之前，还需要设置**IDT（Interrupt Descriptor Table，中断描述符表）**。在实模式下，CPU把内存单元的0~1KB处作为中断向量表，每个表项为一个中断向量，占4个字节，所以一共有256个中断向量。在保护模式下，中断向量表称为中断描述符表，每个表项称为**门描述符（Gate Descriptor）**，中断发生时必须先通过这些门才能进入处理程序。和中断向量表一样，门描述符最多有256项，每个占8字节，所以IDT最多占2048字节。

![gate_descriptor](/images/ASM/gate.png)

其中，

P是段是否存在于内存中的标志，

DPL是段描述符的特权级，

D是标志位，用于区分32位（1）和16位（0），

XXX是门类型码，包含的意义如下：
```
1．任务门（Task gate）
其类型码为101，门中包含了一个进程的TSS 段选择符，但偏移量部分没有使用，
因为TSS本身是作为一个段来对待的，因此，任务门不包含某一个入口函数的地址。
TSS 是Intel 所提供的任务切换机制，但是 Linux 并没有采用任务门来进行任务切换。

2．中断门（Interrupt gate）
其类型码为110，中断门包含了一个中断或异常处理程序所在段的选择符和段内偏移量。
当控制权通过中断门进入中断处理程序时，处理器清IF 标志，即关中断，以避免嵌套中断的发生。
中断门中的DPL（Descriptor Privilege Level）为0，因此，用户态的进程不能访问Intel 的中断门。
所有的中断处理程序都由中断门激活，并全部限制在内核态。

3．陷阱门（Trap gate）
其类型码为111，与中断门类似，其唯一的区别是，控制权通过陷阱门进入处理程序时维持IF 标志位不变，
也就是说，不关中断。

4．系统（调用）门（System gate）
这是Linux 内核特别设置的，用来让用户态的进程访问Intel 的陷阱门，
因此，门描述符的DPL 为3。通过系统门来激活4 个Linux 异常处理程序，
它们的向量是3、4、5 及128，也就是说，在用户态下，
可以使用int 3、into、bound 及int 0x80 四条汇编指令。
```

IDT和GDT一样可以存在内存的任一位置，使用**IDTR（中断描述符表寄存器）**存放中断描述符表在内存的起始地址，其内容和GDTR一样，也是一个48位的寄存器，低16位存放段界限（也就是中断描述符表的大小），高32位保存IDT的基地址。使用LIDT命令设置IDTR，其命令形式同LGDT和LLDT。


### 参考
[中断机制和中断描述符表、中断和异常的处理-s1mba](http://blog.csdn.net/jnu_simba/article/details/11722703)
[技术部落](http://www.techbulo.com/708.html)