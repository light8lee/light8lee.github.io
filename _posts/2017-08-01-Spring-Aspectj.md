---
layout: post
title: Spring Aspectj
date: 2017-08-01 19:20
category: "Java"
---

### 前言

使用注解来实现AOP。

### 正文

建立一个maven项目，groupId为pub.light8lee，artifactId为Aspect，在`pom.xml`中添加：

```xml
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-context</artifactId>
            <version>4.3.10.RELEASE</version>
        </dependency>
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-core</artifactId>
            <version>4.3.10.RELEASE</version>
        </dependency>
        <dependency>
            <groupId>org.aspectj</groupId>
            <artifactId>aspectjweaver</artifactId>
            <version>1.8.10</version>
        </dependency>
```

新建一个简单的代表狗的类：

```java
package pub.light8lee;

public class Dog {
    public void bark() {
        System.out.println("Wang Wang Wang");
    }
}
```

在`src/main/`下创建目录`resources`，并向其中添加`AroundAdvice.xml`，内容如下：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:context="http://www.springframework.org/schema/context"
       xmlns:aop="http://www.springframework.org/schema/aop"
       xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd
        http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context.xsd
        http://www.springframework.org/schema/aop http://www.springframework.org/schema/aop/spring-aop.xsd">

    <bean id="dog" class="pub.light8lee.Dog"></bean>

</beans>
```

然后测试输出：

```java
package pub.light8lee;

import org.springframework.context.ApplicationContext;
import org.springframework.context.support.ClassPathXmlApplicationContext;
/**
 * Hello world!
 *
 */
public class App 
{
    public static void main( String[] args ) {
        ApplicationContext context =
                new ClassPathXmlApplicationContext("AroundAdvice.xml");
        Dog dog = context.getBean(Dog.class);
        dog.bark();
    }
}
```

显然结果就是`Wang Wang Wang`。

接下来就是使用注解来达到AOP的效果，首先创建一个[Annotations](http://docs.oracle.com/javase/1.5.0/docs/guide/language/annotations.html)：

```java
package pub.light8lee;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface BeforeCommit {
}
```

这里关于`@Target`和`@Retention`有两个[说明](http://www.cnblogs.com/bingoidea/archive/2011/03/31/2000726.html)：

```
深入注释： 
     @Target:指定程序元定义的注释所使用的地方，它使用了另一个类：ElementType，是一个枚举类定义了注释类型可以应用到不同的程序元素以免使用者误用。看看java.lang.annotation 下的源代码： 

@Documented  
@Retention(RetentionPolicy.RUNTIME)  
@Target(ElementType.ANNOTATION_TYPE)  
public @interface Target {  
    ElementType[] value();  
} 


     ElementType是一个枚举类型，指明注释可以使用的地方，看看ElementType类： 
public enum ElementType {  
     TYPE, // 指定适用点为 class, interface, enum  
     FIELD, // 指定适用点为 field  
     METHOD, // 指定适用点为 method  
     PARAMETER, // 指定适用点为 method 的 parameter  
     CONSTRUCTOR, // 指定适用点为 constructor  
     LOCAL_VARIABLE, // 指定使用点为 局部变量  
     ANNOTATION_TYPE, //指定适用点为 annotation 类型  
     PACKAGE // 指定适用点为 package  
} 
     @Retention：这个元注释和java编译器处理注释的注释类型方式相关，告诉编译器在处理自定义注释类型的几种不同的选择，需要使用RetentionPolicy枚举类。此枚举类只有一个成员变量，可以不用指明成名名称而赋值，看Retention的源代码： 

@Documented  
@Retention(RetentionPolicy.RUNTIME)  
@Target(ElementType.ANNOTATION_TYPE)  
public @interface Retention {  
    RetentionPolicy value();  
} 
     类中有个RetentionPolicy类，也是一个枚举类，具体看代码： 

public enum RetentionPolicy {  
     SOURCE, // 编译器处理完Annotation后不存储在class中  
     CLASS, // 编译器把Annotation存储在class中，这是默认值  
     RUNTIME // 编译器把Annotation存储在class中，可以由虚拟机读取,反射需要  
} 
     @Documented：是一个标记注释，表示注释应该出现在类的javadoc中，因为在默认情况下注释时不包括在javadoc中的。 

所以如果花费了大量的时间定义一个注释类型，并想描述注释类型的作用，可以使用它。 

注意他与@Retention(RetentionPolicy.RUNTIME)配合使用，因为只有将注释保留在编译后的类文件中由虚拟机加载， 

然后javadoc才能将其抽取出来添加至javadoc中。 
```

然后定义切面

```java
package pub.light8lee;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

@Component
@Aspect
public class BeforeCommitAnnotationAspect {
    @Around(value = "@annotation(pub.light8lee.BeforeCommit)", argNames = "pjp")
    public Object aroundAdvice(final ProceedingJoinPoint pjp) {
        System.out.println("---- Before ----");
        try {
            pjp.proceed();
        } catch (Throwable e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        } finally {
            System.out.println("---- After ----");
        }
        return null;
    }
}
```

这里`@Around`这个使用切入点指示符，表明将对包含注解`BeforeCommit`的方法进行劫持,

```
当定义一个Around增强处理方法时，该方法的第一个形参必须是 ProceedingJoinPoint 类型，在增强处理方法体内，调用ProceedingJoinPoint的proceed方法才会执行目标方法------这就是@Around增强处理可以完全控制目标方法执行时机、如何执行的关键；如果程序没有调用ProceedingJoinPoint的proceed方法，则目标方法不会执行。
```
`@Componet`表示该类是一个自动扫描组件，`@Aspect`注解修饰的bean都将被Spring自动识别并用于配置在Spring AOP。

在`AroundAdvice.xml`中启用Aspectj，以及自动扫描特性：

```xml
    <aop:aspectj-autoproxy></aop:aspectj-autoproxy>
    <context:component-scan base-package="pub.light8lee"></context:component-scan>
```

然后在Dog类中的bark方法上添注解：

```java
    @BeforeCommit
    public void bark() {
        System.out.println("Wang Wang Wang");
    }
```

仍然运行之前的测试代码，此时可以实现了AOP的效果：

```
---- Before ----
Wang Wang Wang
---- After ----
```

### 参考

[05 Spring Aop实例（AOP 如此简单）@Aspect、@Around 注解方式配置](http://www.jianshu.com/p/9517c90db0d4)

[AspectJ切入点语法详解](http://sishuok.com/forum/posts/list/281.html)

[Aspect Oriented Programming with Spring](http://docs.spring.io/spring/docs/current/spring-framework-reference/html/aop.html#aop-ataspectj)