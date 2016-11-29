---
layout: post
title: 升级Fedora 25
date: 2016-11-29 16:51
category: "other"
---

### 前言
Fedora 25已经发布，作为Fedora追随者的我怎么能错过，赶紧升升升！

### 发展
升级的指导很简单，搬运一下官方给出的建议：

1. 备份你的重要文件
2. 使用dnf升级你的系统<br>**sudo dnf upgrade --refresh**
3. 下载*install dnf-plugin-system-upgrade*包<br>**sudo dnf install dnf-plugin-system-upgrade**
4. 下载最新的包<br>**sudo dnf system-upgrade download --refresh --releasever=25**
5. 启动升级程序<br>**sudo dnf system-upgrade reboot**

过程很简单，不过可能我的环境比较恶劣，所以在进行第4步时，我先做了将第三方的repo关闭，有：

```shell
sudo dnf config-manager --set-disabled rpmfusion-free
sudo dnf config-manager --set-disabled rpmfusion-nonfree
sudo dnf config-manager --set-disabled rpmfusion-free-updates
sudo dnf config-manager --set-disabled rpmfusion-nonfree-updates
sudo dnf config-manager --set-disabled google-chrome
...
```

你可以查看**/etc/yum.repos.d/**目录下的文件，确定你要关闭的repo。
然后我执行的是

```shell
sudo dnf system-upgrade download --refresh --releasever=25 --allowerasing --nogpgcheck -y
```

担心自己手贱取消，所以用了*-y*命令。
然后就是无尽的等待，不知道为什么163的源好慢，而且又关不掉（也行是我不会:)）。
先留一张截屏作为纪念（当初为了免于受无线驱动的困扰，用的是基于Fedora的Korora）。

![Screen](/images/other/Update-Fedora.png)

### 结尾
等我的好消息！
