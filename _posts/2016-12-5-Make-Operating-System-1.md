---
layout: post
title: 自制操作系统（一）
date: 2016-12-5 23:06
category: "Operating-System"
---

### 前言
程序员的艺术之一——操作系统，我来了。

### 发展
我将使用的汇编是NASM的汇编，NASM汇编的语法类似Intel汇编，不过更加简洁一些，写起来比较方便。再一个是利用**qemu**来模拟 出一台机器供我们使用。
这里直接上干货。

{% highlight nasm %}
ORG 0x7c00
start:
	mov ax, 0
	mov ds, ax
	mov si, msg
putloop:
	mov al, [si]
	add si, 1
	cmp al, 0
	je fin
	mov ah, 0x0e
	mov bx, 15
	int 0x10
	jmp putloop
fin:
	hlt
	jmp fin
msg:
	db 0x0a, 0x0a
	db "hello world"
	db 0x0a
	db 0
	times 510-($-$$) db 0
	db 0x55, 0xaa
{% endhighlight %}

大意就是在屏幕上显示“hello world”，其中最后两句话比较关键，它的目的是填充0直到510个字节为止，然后填充一个魔术数0x55,0xaa表示是个启动分区。
将这个文件保存为“floppy.nas"，然后很简单，

```shell
nasm floppy.nas
```

可以看到当前目录下生成了一个名为**floopy**的文件。然后运行：

```shell
qemu-system-i386 floopy
```

神奇的事情诞生了！

![echo](/images/Operating-System/echo-hello-world.png)

### 结尾
好吧，其实这并不算一个操作系统，它只是显示了一句话，不过还是很开心！
