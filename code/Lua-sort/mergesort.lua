local arrs = {}
local f = assert(io.open("sort_inputs.txt"), "r")
local j = 1
while true do
    local num = f:read("*number")
    if not num then break end
    arrs[j] = num
    j = j + 1
end

local function merge(t1, t2)
    local i1 = 1
    local i2 = 1
    local res = {}
    local j = 1
    while i1 <= #t1 and i2 <= #t2 do
        if t1[i1] < t2[i2] then
            res[j] = t1[i1]
            i1 = i1 + 1
        else
            res[j] = t2[i2]
            i2 = i2 + 1
        end
        j = j + 1
    end
    while i1 <= #t1 do
        res[j] = t1[i1]
        i1 = i1 + 1
        j = j + 1
    end
    while i2 <= #t2 do
        res[j] = t2[i2]
        i2 = i2 + 1
        j = j + 1
    end
    return res
end

local function mergesort(t, p, q)
    if q < p then error("out of boundary") end
    if q == p then return {t[p]} end
    local mid = (p + q) // 2
    local left = mergesort(t, p, mid)
    local right = mergesort(t, mid+1, q)
    return merge(left, right)
end

res = mergesort(arrs, 1, #arrs)
for k, v in ipairs(res) do
    print(k .. ": " .. v)
end

f:close()
