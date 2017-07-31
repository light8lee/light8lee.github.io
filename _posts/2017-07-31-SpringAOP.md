---
layout: post
title: Spring AOP
date: 2017-07-31 20:40
category: "Operating-System"
---

### 前言

小记一下Spring中的AOP知识点

### 正文

Spring AOP（Aspect-Oriented Programming）是对OOP提供另一种思考程序结构方式的补充。OOP模块化的关键单位是类，而在AOP中，模块化单位是方面。方面使得可以模块化诸如跨多个类型和对象的事务管理等问题。（[英文原意看这里](https://docs.spring.io/spring/docs/current/spring-framework-reference/html/aop.html)）
AOP使得程序能够在运行一些method之前／之后额外做一些事情。

#### 准备工作

此处利用IDEA创建demo工程。

![pic1](/images/SpringAOP/Pic1.jpeg)

groupId为pub.light8lee.spring，artifactId为SpirngAOP，修改工程中的`pom.xml`文件，在`<dependencies .../>`tag里添加：

```xml
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-context</artifactId>
            <version>4.3.8.RELEASE</version>
        </dependency>
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-core</artifactId>
            <version>4.3.8.RELEASE</version>
        </dependency>
```

表示要使用Spring。

然后在`src/main/`目录下建立一个`resources`目录，最终得到一个基本的demo，之后的工作都会在这个工程上展开，项目目录如图：

![pic2](/images/SpringAOP/Pic2.jpeg)

#### Advice

为了使用此功能，还需要在`pom.xml`中额外添加依赖：

```xml
    <dependency>
        <groupId>org.glassfish.hk2.external</groupId>
        <artifactId>cglib</artifactId>
        <version>2.2.0-b23</version>
    </dependency>
```

存在四种通知：

* Before Advice：在切入点之前执行
* After Returning Advice：在切入点之后执行
* Around Advice：包围切入点，执行自定义任务
* After Throwing Advice：在切入点抛出异常后执行

此处只说明一下Before Advice和Around Returing Advice，其余的通知可参见实验楼的文档。

新建相应的package，以及所需的测试类`CustomerService`

```java
package pub.light8lee.spring.aop.advice;

public class CustomerService {

    public void printName() {
        System.out.println("Customer name: " + this.name);
    }

    public void setName(String name) {
        this.name = name;
    }

    private String name;
}
```

使用Before Advice，此时需要实现借口MethodBeforeAdvice的before方法：

```java
package pub.light8lee.spring.aop.advice;

import java.lang.reflect.Method;
import org.springframework.aop.MethodBeforeAdvice;
import sun.jvm.hotspot.memory.SystemDictionary;

public class HijackBeforeMethod implements MethodBeforeAdvice {

    public void before(Method method, Object[] args, Object target) throws Throwable {
        System.out.println("HijackBeforeMethod : Before method hijacked!");
    }
}
```

在`resources`目录下新建`SpringAOPAdvice.xml`，内容如下：

```xml
<?xml version = "1.0" encoding = "UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:schemaLocation="http://www.springframework.org/schema/beans
    http://www.springframework.org/schema/beans/spring-beans.xsd">

    <bean id="customerService" class="pub.light8lee.spring.aop.advice.CustomerService">
        <property name="name" value="Hello World" />
    </bean>
    <bean id="hijackBeforeMethodBean" class="pub.light8lee.spring.aop.advice.HijackBeforeMethod"/>

    <bean id="customerServiceProxy" class="org.springframework.aop.framework.ProxyFactoryBean">
        <property name="target" ref="customerService"/>
        <property name="interceptorNames">
            <list>
                <value>hijackBeforeMethodBean</value>
            </list>
        </property>
    </bean>
</beans>
```

这里创建了一个代理，设置要劫持`customerService`这个bean的方法（这回劫持其中的所有的方法），而且是使用Before Advice来劫持。

测试代码如下：

```java
package pub.light8lee.spring.aop.advice;

import org.springframework.context.ApplicationContext;
import org.springframework.context.support.ClassPathXmlApplicationContext;

public class App {

    public static void main(String []args) {
        ApplicationContext context = new ClassPathXmlApplicationContext(new String[] {"SpringAOPAdvice.xml"});
        CustomerService cust = (CustomerService) context.getBean("customerServiceProxy");

        cust.printName();
    }
}
```

运行结果为：

```
HijackBeforeMethod : Before method hijacked!
Customer Name: Hello World
```

使用Around Advice，需要实现MethodInterceptor接口的invoke方法：

```java
package pub.light8lee.spring.aop.advice;

import java.util.Arrays;
import org.aopalliance.intercept.MethodInterceptor;
import org.aopalliance.intercept.MethodInvocation;

public class HijackAroundMethod implements MethodInterceptor {
    public Object invoke(MethodInvocation invocation) throws Throwable {
        System.out.println("Method name: " + invocation.getMethod().getName());
        System.out.println("Method arguments: " + Arrays.toString(invocation.getArguments()));
        System.out.println("HijackArdoundMethod: Before hijacked!");

        try {
            Object result = invocation.proceed();
            System.out.println("HijackAroundMethod: After method hijacked!");
            return result;
        } catch (IllegalArgumentException e) {
            System.out.println("HijackAroundMethod: Throw exception hijacked!");
            throw e;
        }
    }
}
```

更改代理bean配置为：

```xml
<bean id="hijackAroundMethodBean" class="pub.light8lee.spring.aop.advice.HijackAroundMethod"/>


<bean id="customerServiceProxy" class="org.springframework.aop.framework.ProxyFactoryBean">
        <property name="target" ref="customerService" />
        <property name="interceptorNames">
            <list>
                <value>hijackAroundMethodBean</value>
            </list>
        </property>
    </bean>
```


运行结果如下：

```
Method name: printName
Method arguments: []
HijackArdoundMethod: Before hijacked!
Customer name: Hello World
HijackAroundMethod: After method hijacked!
```

#### Pointcut

实际使用中，可能并不需要劫持全部的方法，这就要用到Pointcut，可以有名字匹配法和正则表达式匹配法这两种模式去匹配要劫持的方法，相应的配置如下：

```xml
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:schemaLocation="http://www.springframework.org/schema/beans
    http://www.springframework.org/schema/beans/spring-beans.xsd">

    <bean id="customerService" class="pub.light8lee.spring.aop.advice.CustomerService">
        <property name="name" value="shiyanlou" />
        <property name="url" value="shiyanlou.com" />
    </bean>

    <bean id="hijackAroundMethodBean" class="pub.light8lee.spring.aop.advice.HijackAroundMethod" />

    <bean id="customerServiceProxy" class="org.springframework.aop.framework.ProxyFactoryBean">
        <property name="target" ref="customerService" />
        <property name="interceptorNames">
            <list>
                <value>customerAdvisor</value>
            </list>
        </property>
    </bean>

    <!-- Name match
    <bean id="customerPointcut" class="org.springframework.aop.support.NameMatchMethodPointcut">
        <property name="mappedName" value="printName" />
    </bean>

    <bean id="customerAdvisor" class="org.springframework.aop.support.DefaultPointcutAdvisor">
        <property name="pointcut" ref="customerPointcut" />
        <property name="advice" ref="hijackAroundMethodBean" />
    </bean>
    -->

    <!-- Regex match -->
    <bean id="customerAdvisor" class="org.springframework.aop.support.RegexpMethodPointcutAdvisor">
        <property name="patterns">
            <list>
                <value>.*Name.*</value>
            </list>
        </property>
        <property name="advice" ref="hijackAroundMethodBean" />
    </bean>

</beans>
```


#### Auto Proxy

手动为每一个需要 AOP 的 bean 创建 Proxy bean可能会消耗大量的精力，所以Spring提供了两种方法自动创建Proxy。

利用 BeanNameAutoProxyCreator 自动创建 proxy，可以利用Bean name的相应特性自动创建proxy，此时将所有的 bean（通过名字或正则表达式匹配）和 advisor 形成一个独立的单元，配置如下：

```xml
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:schemaLocation="http://www.springframework.org/schema/beans
        http://www.springframework.org/schema/beans/spring-beans.xsd">

    <bean id="customerService" class=" pub.light8lee.spring.aop.advice.CustomerService">
        <property name="name" value="Shiyanlou" />
        <property name="url" value="shiyanlou.com" />
    </bean>

    <bean id="hijackAroundMethodBean" class=" pub.light8lee.spring.aop.advice.HijackAroundMethod" />

    <bean
            class="org.springframework.aop.framework.autoproxy.BeanNameAutoProxyCreator">
        <property name="beanNames">
            <list>
                <value>*Service</value>
            </list>
        </property>
        <property name="interceptorNames">
            <list>
                <value>customerAdvisor</value>
            </list>
        </property>
    </bean>

    <bean id="customerAdvisor" class="org.springframework.aop.support.NameMatchMethodPointcutAdvisor">
        <property name="mappedName" value="printName" />
        <property name="advice" ref="hijackAroundMethodBean" />
    </bean>

</beans>
```

在以上配置中只要 bean 的 id 符合 `*Service `，就会自动创建 proxy ，所以，可以用以下代码获得 proxy 。

```java
CustomerService cust = (CustomerService) appContext.getBean("customerService");
```

利用 DefaultAdvisorAutoProxyCreator 创建 Proxy，任何匹配 Advisor 的 bean ，都会自动创建 Proxy 实现 AOP：

```xml
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:schemaLocation="http://www.springframework.org/schema/beans
        http://www.springframework.org/schema/beans/spring-beans.xsd">

    <bean id="customerService" class=" pub.light8lee.spring.aop.advice.CustomerService">
        <property name="name" value="Shiyanlou" />
        <property name="url" value="shiyanlou.com" />
    </bean>

    <bean id="hijackAroundMethodBean" class=" pub.light8lee.spring.aop.advice.HijackAroundMethod" />

    <!--
    <bean
            class="org.springframework.aop.framework.autoproxy.BeanNameAutoProxyCreator">
        <property name="beanNames">
            <list>
                <value>*Service</value>
            </list>
        </property>
        <property name="interceptorNames">
            <list>
                <value>customerAdvisor</value>
            </list>
        </property>
    </bean>

    <bean id="customerAdvisor" class="org.springframework.aop.support.NameMatchMethodPointcutAdvisor">
        <property name="mappedName" value="printName" />
        <property name="advice" ref="hijackAroundMethodBean" />
    </bean>
    -->

    <bean id="customerAdvisor"
          class="org.springframework.aop.support.NameMatchMethodPointcutAdvisor">
        <property name="mappedName" value="printName" />
        <property name="advice" ref="hijackAroundMethodBean" />
    </bean>

    <bean
            class="org.springframework.aop.framework.autoproxy.DefaultAdvisorAutoProxyCreator" />

</beans>
```

此时xml 中任何 bean ，只要有 method 名字为 printName ，使用以下代码时，都会自动创建 Proxy ，来支持 AOP 


### 参考

[Spring框架入门教程（新版](https://www.shiyanlou.com/courses/578)