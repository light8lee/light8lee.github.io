int main()
{
    /* __asm__ ("movl %eax, %ebx"); */
/*    int rv, foo = 4;
    __asm__ __volatile__ (
            "mov %%ecx, %%eax\n\t"
            "mov %%eax, %%ebx"
            : "=b" (rv)
            : "c" (foo)
            : "eax"
            );
*/
int endlow, endhigh, startlow, starthigh;
__asm__ (
		"subl %2, %0\n\t"
        "sbbl %3, %1"
        : "=a" (endlow), "=d" (endhigh)
        : "r" (startlow), "r" (starthigh),
          "0" (endlow), "1" (endhigh)
        );
    return 0;
}
