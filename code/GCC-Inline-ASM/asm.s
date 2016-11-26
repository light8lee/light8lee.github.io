	.file	"asm.c"
	.text
	.globl	main
	.type	main, @function
main:
.LFB0:
	.cfi_startproc
	pushl	%ebp
	.cfi_def_cfa_offset 8
	.cfi_offset 5, -8
	movl	%esp, %ebp
	.cfi_def_cfa_register 5
	pushl	%ebx
	subl	$16, %esp
	.cfi_offset 3, -12
	movl	-8(%ebp), %ecx
	movl	-12(%ebp), %ebx
	movl	-16(%ebp), %eax
	movl	-20(%ebp), %edx
#APP
# 14 "asm.c" 1
	subl %ecx, %eax
	sbbl %ebx, %edx
# 0 "" 2
#NO_APP
	movl	%eax, -16(%ebp)
	movl	%edx, -20(%ebp)
	movl	$0, %eax
	addl	$16, %esp
	popl	%ebx
	.cfi_restore 3
	popl	%ebp
	.cfi_restore 5
	.cfi_def_cfa 4, 4
	ret
	.cfi_endproc
.LFE0:
	.size	main, .-main
	.ident	"GCC: (GNU) 6.2.1 20160916 (Red Hat 6.2.1-2)"
	.section	.note.GNU-stack,"",@progbits
