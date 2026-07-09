from __future__ import annotations

import re


FORMULA_IMAGE_REPLACEMENTS = {
    "pasted image 20260504220018": r"""
$$
f(x,i)=R_{i\theta}x=
\begin{pmatrix}
\cos(i\theta)&-\sin(i\theta)\\
\sin(i\theta)&\cos(i\theta)
\end{pmatrix}
\begin{pmatrix}x_1\\x_2\end{pmatrix}.
$$
""",
    "pasted image 20260504220037": r"""
$$
f(q,i)^\top f(k,j)=q^\top R_{(i-j)\theta}k.
$$
""",
    "pasted image 20260504220153": r"""
$$
\theta_m=\mathrm{base}^{-2m/d},
\qquad m=0,1,\ldots,\frac d2-1.
$$
""",
    "pasted image 20260504222349": r"""
$$
\operatorname{RoPE}(x,i)_{2m:2m+2}
=
\begin{pmatrix}
x_{2m}\cos(i\theta_m)-x_{2m+1}\sin(i\theta_m)\\
x_{2m}\sin(i\theta_m)+x_{2m+1}\cos(i\theta_m)
\end{pmatrix}.
$$
""",
    "pasted image 20260504224052": r"""
$$
x=[x_0,x_1,x_2,x_3,\ldots].
$$
""",
    "pasted image 20260504224105": r"""
$$
\begin{aligned}
x'_{2m}&=x_{2m}\cos\theta-x_{2m+1}\sin\theta,\\
x'_{2m+1}&=x_{2m+1}\cos\theta+x_{2m}\sin\theta.
\end{aligned}
$$
""",
    "pasted image 20260504224942": r"""
原始 Transformer 的正弦位置编码使用

$$
\begin{aligned}
\operatorname{PE}(pos,2i)&=\sin\left(pos\cdot10000^{-2i/d_{\mathrm{model}}}\right),\\
\operatorname{PE}(pos,2i+1)&=\cos\left(pos\cdot10000^{-2i/d_{\mathrm{model}}}\right).
\end{aligned}
$$
""",
    "pasted image 20260504225117": r"""
相邻频率之比、最低频率及其周期分别为

$$
\frac{\theta_{m+1}}{\theta_m}=\mathrm{base}^{-2/d},
\qquad
\theta_{\min}\approx10^{-4},
\qquad
\frac{2\pi}{\theta_{\min}}\approx62832.
$$
""",
    "pasted image 20260504225132": r"""
不同频率分量叠加后，RoPE 内积可写为

$$
\left\langle\operatorname{RoPE}(q,i),\operatorname{RoPE}(k,j)\right\rangle
=
\sum_m
\left(q_{2m}k_{2m}+q_{2m+1}k_{2m+1}\right)
\cos\left((i-j)\theta_m\right)
+\text{交叉项}.
$$
""",
    "pasted image 20260504225704": r"""
|对比维度|RoPE|T5 Relative Bias|ALiBi|
|---|---|---|---|
|实现原理|旋转 $Q$、$K$|学习相对位置偏置|加入固定线性惩罚|
|额外参数|无|约 $(2L-1)\times h$|每个头一个斜率|
|外推能力|较好|较弱|较好|
""",
    "pasted image 20260506091613": r"""
$$
P_{\text{top-}k}(v)=
\begin{cases}
\dfrac{P(v)}{\sum_{u\in\operatorname{TopK}}P(u)},&v\in\operatorname{TopK},\\
0,&\text{otherwise}.
\end{cases}
$$
""",
    "pasted image 20260506091639": r"""
$$
V^{(p)}
=
\arg\min_{V'\subseteq V}
\left\{|V'|:\sum_{v\in V'}P(v)\ge p\right\},
$$

$$
P_{\text{top-}p}(v)=
\begin{cases}
\dfrac{P(v)}{\sum_{u\in V^{(p)}}P(u)},&v\in V^{(p)},\\
0,&\text{otherwise}.
\end{cases}
$$
""",
    "pasted image 20260506091711": r"""
$$
P(v)=\frac{\exp(z_v)}{\sum_u\exp(z_u)}.
$$
""",
    "pasted image 20260506091725": r"""
$$
P_\tau(v)=\frac{\exp(z_v/\tau)}{\sum_u\exp(z_u/\tau)}.
$$
""",
    "pasted image 20260505122330": r"""
$$
\max_{\pi_\theta}
\mathbb E_{x\sim\mathcal D,\;y\sim\pi_\theta(\cdot\mid x)}[r(x,y)]
-
\beta\mathbb E_{x\sim\mathcal D}
\left[
\operatorname{KL}
\left(\pi_\theta(\cdot\mid x)\middle\|\pi_{\mathrm{ref}}(\cdot\mid x)\right)
\right].
$$
""",
    "pasted image 20260505122349": r"""
$$
\pi^*(y\mid x)
=
\frac{1}{Z(x)}
\pi_{\mathrm{ref}}(y\mid x)
\exp\left(\frac{r(x,y)}{\beta}\right).
$$
""",
    "pasted image 20260505122710": r"""
$$
\mathcal L_{\mathrm{DPO}}
=
-
\mathbb E_{(x,y_w,y_l)}
\left[
\log\sigma\left(
\beta\log\frac{\pi_\theta(y_w\mid x)}{\pi_{\mathrm{ref}}(y_w\mid x)}
-
\beta\log\frac{\pi_\theta(y_l\mid x)}{\pi_{\mathrm{ref}}(y_l\mid x)}
\right)
\right].
$$
""",
    "pasted image 20260505122914": r"""
$$
A_i
=
\frac{r_i-\operatorname{mean}(r_1,\ldots,r_G)}
{\operatorname{std}(r_1,\ldots,r_G)},
$$

$$
\mathcal J_{\mathrm{GRPO}}(\theta)
=
\frac1G\sum_{i=1}^G\frac1{|y_i|}
\sum_{t=1}^{|y_i|}
\min\left(
\rho_{i,t}A_i,
\operatorname{clip}(\rho_{i,t},1-\epsilon,1+\epsilon)A_i
\right).
$$
""",
    "pasted image 20260505123639": r"""
$$
R_{\mathrm{total}}
=
r(x,y)-\beta\log\frac{\pi_\theta(y\mid x)}{\pi_{\mathrm{ref}}(y\mid x)}.
$$
""",
    "pasted image 20260505123659": r"""
$$
\mathcal L_{\mathrm{value}}
=
\operatorname{MSE}\left(V_\phi(s_t),R_{\mathrm{total}}\right).
$$
""",
    "pasted image 20260505123829": r"""
$$
\hat A_t=R_t-b(s_t).
$$
""",
    "pasted image 20260505124023": r"""
$$
A_i
=
\frac{r_i-\operatorname{mean}(r_1,\ldots,r_G)}
{\operatorname{std}(r_1,\ldots,r_G)}.
$$
""",
    "pasted image 20260507225548": r"""
$$
\mathcal L_{\mathrm{KD}}
=
T^2\operatorname{KL}
\left(
p_T^{\mathrm{teacher}}
\middle\|
p_T^{\mathrm{student}}
\right).
$$
""",
    "pasted image 20260507225658": r"""
$$
\mathcal L_{\mathrm{forward}}
=
\operatorname{KL}
\left(p_T^{\mathrm{teacher}}\middle\|p_T^{\mathrm{student}}\right),
\qquad
\mathcal L_{\mathrm{reverse}}
=
\operatorname{KL}
\left(p_T^{\mathrm{student}}\middle\|p_T^{\mathrm{teacher}}\right).
$$
""",
    "pasted image 20260507225832": r"""
$$
D_{\mathrm{KL}}(Q\|P)
=
\sum_xQ(x)\log\frac{Q(x)}{P(x)}
=
\mathbb E_{x\sim Q}\left[\log\frac{Q(x)}{P(x)}\right].
$$
""",
    "pasted image 20260507225845": r"""
反向 KL 按学生分布 $Q$ 加权：$Q(x)$ 很小时，即使教师概率 $P(x)$ 很高，该区域对损失的贡献仍然有限；反之，$Q(x)$ 很大而 $P(x)$ 很小时会受到强惩罚。
""",
    "pasted image 20260507225906": r"""
前向 KL 按教师分布 $P$ 加权：

$$
D_{\mathrm{KL}}(P\|Q)
=
\sum_xP(x)\log\frac{P(x)}{Q(x)}.
$$

因此前向 KL 倾向 mode-covering，反向 KL 倾向 mode-seeking。
""",
    "pasted image 20260507230155": r"""
$$
\begin{aligned}
H(P)&=-\sum_xP(x)\ln P(x),\\
H(P,Q)&=-\sum_xP(x)\ln Q(x),\\
D_{\mathrm{KL}}(P\|Q)
&=H(P,Q)-H(P)
=\sum_xP(x)\ln\frac{P(x)}{Q(x)}.
\end{aligned}
$$
""",
}


def formula_image_replacement(name: str) -> str | None:
    key = name.rsplit(".", 1)[0].strip().lower()
    replacement = FORMULA_IMAGE_REPLACEMENTS.get(key)
    return replacement.strip() if replacement else None


INLINE_MATH_REPLACEMENTS = {
    "transformer": (
        (
            "$Attention(Q,K,V) = softmax(QK^T / √d_k) V$",
            r"$\operatorname{Attention}(Q,K,V)=\operatorname{softmax}\left(QK^\top/\sqrt{d_k}\right)V$",
        ),
        (
            "$MultiHead(Q,K,V) = Concat(head_1,..., head_h)W^O$",
            r"$\operatorname{MultiHead}(Q,K,V)=\operatorname{Concat}(\operatorname{head}_1,\ldots,\operatorname{head}_h)W^O$",
        ),
        ("dmodel→dffdmodel​→dff​", r"$d_{\mathrm{model}}\to d_{\mathrm{ff}}$"),
        ("dff→dmodeldff​→dmodel​", r"$d_{\mathrm{ff}}\to d_{\mathrm{model}}$"),
        (
            "`g_i = Softmax(W_g · x)_i`",
            r"$g_i=\operatorname{softmax}(W_gx)_i$",
        ),
        (
            "`y = Σᵢ (g_i * Expert_i(x))`",
            r"$y=\sum_{i\in\operatorname{TopK}}g_i\operatorname{Expert}_i(x)$",
        ),
    ),
    "sampling": (
        ("概率 PP", "概率 $P$"),
        ("阈值 pp（如 0.9）", "阈值 $p$（如 $0.9$）"),
        ("设 VV 为词表，P(v) 为 token vv 的概率", "设 $V$ 为词表，$P(v)$ 为 token $v$ 的概率"),
        ("累计概率 ≥ p", r"累计概率 $\ge p$"),
        ("Temperature (τ)", r"Temperature（$\tau$）"),
        ("τ=1", r"$\tau=1$"),
        ("τ>1", r"$\tau>1$"),
        ("0<τ<1", r"$0<\tau<1$"),
        ("logits/τ", r"$z/\tau$"),
        ("π_θold", r"$\pi_{\theta_{\mathrm{old}}}$"),
    ),
    "lora": (
        ("`h = W0·x + ΔW·x = W0·x + B·A·x`", r"$h=W_0x+\Delta Wx=W_0x+BAx$"),
        ("`ΔW = B·A`", r"$\Delta W=BA$"),
        ("`W_new = W0 + B·A`", r"$W_{\mathrm{new}}=W_0+BA$"),
        ("`W0`", r"$W_0$"),
        ("`ΔW`", r"$\Delta W$"),
        ("ΔW_Q", r"$\Delta W_Q$"),
        ("ΔW_V", r"$\Delta W_V$"),
        ("ΔW", r"$\Delta W$"),
        ("ΔK", r"$\Delta K$"),
        ("ΔQ", r"$\Delta Q$"),
        ("scaling≈2", r"$\mathrm{scaling}\approx2$"),
        ("alpha/r ≈ 2", r"$\alpha/r\approx2$"),
    ),
    "ppo-dpo-grpo": (
        ("πθold", r"$\pi_{\theta_{\mathrm{old}}}$"),
        ("πref", r"$\pi_{\mathrm{ref}}$"),
        ("πθ", r"$\pi_\theta$"),
        ("Vϕ", r"$V_\phi$"),
        ("AtAt​", r"$A_t$"),
        ("RtRt​", r"$R_t$"),
        ("AiAi​", r"$A_i$"),
        ("Ai​", r"$A_i$"),
        ("RtotalRtotal​", r"$R_{\mathrm{total}}$"),
        ("riri​", r"$r_i$"),
        ("stst​", r"$s_t$"),
    ),
    "opd": (
        ("π_student", r"$\pi_{\mathrm{student}}$"),
        ("KL(π_student \\|\\| π_teacher)", r"$\operatorname{KL}(\pi_{\mathrm{student}}\|\pi_{\mathrm{teacher}})$"),
    ),
}


def normalize_inline_math(text: str, slug: str) -> str:
    replacements = INLINE_MATH_REPLACEMENTS.get(slug, ())
    if not replacements:
        return text

    parts = re.split(r"(?ms)(^```.*?^```\s*)", text)
    for index in range(0, len(parts), 2):
        for old, new in replacements:
            parts[index] = parts[index].replace(old, new)
    return "".join(parts)
