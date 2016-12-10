---
layout: post
title: 自制操作系统（三）
date: 2016-12-10 11:01
category: "Operating-System"
---

### 前言
总于更新了（填坑）。

### 发展
这次内(zi)容(ji)不(bu)多(hui)，仿造Linux v0.11的做法，boot程序将自己从内存**0x7c00**的地方搬运到**0x9000**的地方（这也就是bootstrap的引申意义，拖着自己的鞋带飞起来），然后显示一句话。
主要更改的就是*boot.nas*里的内容。

{% highlight nasm %}
;ORG 0x7C00 ;no use
BOOTSEG EQU 0x07C0
INITSEG EQU 0x9000
SPOINTER EQU 0x0FF00
BITS 16
start:
    mov ax, BOOTSEG
    mov ds, ax
    mov ax, INITSEG
    mov es, ax
    mov cx, 256
    sub si, si
    sub di, di
    rep movsw
    jmp dword INITSEG:show_loading

;===================
; now we are at 0x90000
;===================
show_loading:
    mov ax, cs
    mov ds, ax
    mov es, ax
    mov ss, ax
    mov sp, SPOINTER

    mov si, msg
    mov cx, msg_len
    mov ax, msg
    mov bp, ax
    mov ah, 0x13
    mov al, 0
    mov bh, 0
    mov bl, 0x0FC
    mov dx, 0
    int 0x10

fin:
    hlt
    jmp fin

msg:
    db 0x0A, 0x0A
    db "System Loading..."
    db 0x07
    db 0x0A
msg_len EQU $ - msg

    times 510-($-$$) db 0
    db 0x55, 0xaa
{% endhighlight %}

然后我发现，其实可以用Linux自带的dd命令来将编译好的boot写入启动分区，所以目前，tools目录下的build.c暂时就用不到了，为此我更改了项目根目录下的**Makefile**。

最后，我们*make run*一下：

![run](/images/Operating-System/make-run-3.png)

没错，看来“boot”成功了

### 结尾
就是这样，啦啦啦。