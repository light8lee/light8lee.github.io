---
layout: post
title: gcc内联汇编（一）
date: 2016-11-25 16:29
category: "Operating-System"
---

### 前言
最近在学操作系统，免不了要与Linux打交道，而一个操作系统必定要与底层的硬件打交道，这种艰巨的任务一般都是由C和汇编完成的，在Linux操作系统的实现过程中就是这样，在性能需求高的地方，都是由汇编完成的。Linux是一种类Unix操作系统，所以一定程度上借鉴了Unix的设计，而Unix是由AT&T的贝尔实验室设计的，所以Unix和Linux上面的汇编是AT&T形式的汇编，并不是我们平常接触的Intel汇编，所以汇编指令还是有些差异的，不过由于Linux最开始是用的x86的架构，所以其实只有汇编语言是不同的，翻译成的机器指令还是一样的。这里我将通过边学习边讲述GCC的扩展功能——GCC内联汇编。

### 发展
首先是入门AT&T，其实AT&T汇编和Intel汇编差别不大，主要体现在以下几个方面：


* 在使用寄存器之前需要加%，例如：*movl %eax, %ebx*

* 在操作数的顺序的与Intel汇编相反，目标操作数在右边，源操作数在左边，例如：*movl %eax（源）, %ebx（目的）*；

* 在使用立即数时，需要在数字前加符号$，例如：*movl $20, %eax*；

* 符号常数直接引用，例如：*value: .long 0x12a3f2de; movl value, %eax*，将常数0x12a3f2de装入寄存器ebx。引用符号地址在符号前加符号$，例如：*movl $value, %ebx*则是将符号value的地址装入寄存器ebx。

* 立即数的进制是由前缀确定的，而不是后缀，例如：*movl $0x20, %eax*；

* 操作数的长度是加在指令后的符号表示的，*b（byte，8-bit）*，*w（word，16-bits），*l（long，32-bits）*，*q（quaword，64-bits）*，例如：*movb %ax, %bx*，*movw %ax, %bx*。如果没有指定操作数长度的话，编译器将按照目标操作数的长度来设置，例如：*mov %ax, %bx*等同于*movw %ax, %bx*，*mov $4, %eax*等同于*movl $4, %ebx*，对于没有指定操作数长度，且编译器无法推导的指令，编译器将会报错，例如：*push $4*；

* 对于符号扩展和零扩展，其格式为：基本部分*movs*，*movz*(对应Intel汇编中的*movsx*和*movzx*)，后面接源操作数长度和目的操作数长度。**movsbl**表示*movs from byte to long*；**movsbw**表示*movs from byte to word*；**movswl**表示*movs from word to long*。同理，对movz指令也是一样。另外的Intel格式的符号扩展指令还有：<br>**cbw**  --> sign-extend byte in %al to word in %ax;<br>**cwde** --> sign-extend word in %ax to long in %eax;<br>**cwd**  --> sign-extend word in %ax to long in %dx:%ax;<br>**cdq**  --> sign-extend word in %ax to quaword in %edx:%eax;<br>对应的AT&T语法指令为*cbtw*，*cwtl*，*cwtl*，*cltd*。

* 访存时，Intel的语法为**section:[base+index×scale+displacement]**，而AT&T语法中对应的形式为**section:displacement(base,index,scale)**。其中base和index是任意的32位基址和变址寄存器，scale可以取值1,2,4,8，如不指定则默认为1.section可以是任意段寄存器作为段前缀，默认的段寄存器根据不同情况而不一样。几个例子：**-4(%ebp)**表示base=%ebp, displacement=-4, section=%ss(default), index=0(default)，**foo(,%eax,4)**表示index=%eax, scale=4, displacement=foo, section=%ds(default)，**%gs:foo**这个表达式引用放置于%gs段中的变量goo的值。

### 结尾
这次只是简单介绍了AT&T汇编与Intel汇编的几个区别，下次将开始进入正题，讲述GCC内联汇编的使用。

### 参考
80386有如下寄存器：

1. 8个32位寄存器：%eax，%ebx，%ecx，%edx，%edi，%esi，%ebp，%esp；
2. 8个16位寄存器：%ax，%bx，%cx，%dx，%di，%si，%bp，%sp；
3. 8个8位寄存器：%ah，%al，%bh，%bl，%ch，%cl，%dh，%dl；
4. 6个段寄存器：%cs，%ds，%ss，%es，%fs，%gs；
5. 3个控制寄存器：%cr0，%cr2，%cr3；（%cr1保留不用）
6. 6个debug寄存器：%db0，%db1，%db2，%db3，%db6，%db7；
7. 2个测试寄存器：%tr6，%tr7；
8. 8个浮点寄存器栈：%st(0)，%st(1)，%st(2)，%st(3)，%st(4)，%st(5)，%st(6)，%st(7)。