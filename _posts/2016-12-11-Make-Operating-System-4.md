---
layout: post
title: 自制操作系统（四）
date: 2016-12-11 22:58
category: "Operating-System"
---

### 前言
缓慢更新中。

### 发展
这次模仿Linux v0.11中，利用*boot*将*setup*模块从软盘的第二个扇区加载到内存物理地址为**0x90200**处，然后跳转到setup起始处开始执行。

在编写代码时，我遇到了使用BIOS中断（int 0x13, ah=2）时，出现了错误，由于错误代码存在于ah中，所以我增加了一个打印出错代码的程序，方便自己调试，最后发现是使用QEMU的方式不对，所以我又修改了根目录下的Makefile文件，总算成功的运行了。

这里的setup模块其实很简单，只是简单地打印“setup running”，然后就进入死循环了。
最终的效果如下：

![setup](/images/Operating-System/make-run-4.png)


现在我们的目录如图所示：

```
--Lightex\
|    --boot\
|    |     --boot.nas
|    |     --setup.nas
|    |     --Makefile
|    --tools\
|    |    --build.c
|    |    --Makefile
|    --Makefile
|    --LICENSE
|    --README.md 
```

仅仅多了setup.nas这一个文件。

### 结尾
ok，下次继续。