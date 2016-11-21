
local function percdown(t, k, e)
    local i = k
    local tmp = t[k]
    while i <= e do
        local child = 2 * i
        if child > e then break end
        if child + 1 <= e and t[child] < t[child+1] then
            child = child + 1
        end
        if t[child] > tmp then
            t[i] = t[child]
            i = child
        else
            break
        end
    end
    t[i] = tmp
end

local function heapsort(t)
    for i = #t//2, 1, -1 do
        percdown(t, i, #t)
    end
    for i = #t, 1, -1 do
        t[1], t[i] = t[i], t[1]
        percdown(t, 1, i-1)
    end
end

local arrs = {}
local f = assert(io.open("sort_inputs.txt"), "r")
local j = 1
while true do
    local num = f:read("*number")
    if not num then break end
    arrs[j] = num
    j = j + 1
end

heapsort(arrs)

for k, v in ipairs(arrs) do
    print(k .. ": " .. v)
end
f:close()
