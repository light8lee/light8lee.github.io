---
layout: post
title: 自制操作系统（二）
date: 2016-12-6 14:45
category: "Operating-System"
---

### 前言
今天的内容是把我要做的东西更加工程化一点，所以我特地在github上建立一个项目——[Lightex](https://github.com/light8lee/Lightex)，之后的进展都会放在这上面（如果有人愿意看的话）。

### 发展
简单介绍一下当前的目录：

```
--Lightex\
|    --boot\
|    |     --boot.nas
|    |     --Makefile
|    --tools\
|    |    --build.c
|    |    --Makefile
|    --Makefile
|    --LICENSE
|    --README.md      
```

我把昨天的**flopp.nas**文件放在了boot目录下，并且重命名为**boot.nas**，它会被编译成**boot**，build目录下的**build.c**是用来将编译好的**boot**文件写入要使用的**Lightex.img**中，只需要在Lightex目录下执行：

```shell
make run
```

就可以看到昨天的效果了。

### 结尾
先到这里吧。