---
layout: post
title: Fedora 25升级后记
date: 2016-11-30 13:48
category: "other"
---

### 前言
Fedora 25升级成功！不过貌似无线驱动又存在问题。

### 发展
先上图

![Updated](/images/other/Updated-Fedora.png)

让我们尝试修改驱动，升级时我们关闭了很多repo，这里把他们重新打开：

```shell
sudo dnf config-manager --set-enabled rpmfusion-free
sudo dnf config-manager --set-enabled rpmfusion-nonfree
sudo dnf config-manager --set-enabled rpmfusion-free-updates
sudo dnf config-manager --set-enabled rpmfusion-nonfree-updates
...
```

然后连上有线网络（如果你没有路由器，可以用手机通过USB共享网络给笔记本）。
执行：

```shell
sudo dnf upgrade --allowerasing --best -y
```

你可能还需要加上**--refresh**，然后又是无尽的等待，希望可以成功！

### 结尾
Good Luck to me.