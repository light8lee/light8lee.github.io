local old_input = io.input()
local arrs = {}
local cnt = 1
io.input("sort_inputs.txt")
while true do
    local num = io.read("*number")
    if not num then break end
    arrs[cnt] = num
    cnt =  cnt + 1
end

local function partition(t, p, q)
    math.randomseed(os.time())
    local pos = math.random(p, q)
    t[p], t[pos] = t[pos], t[p]
    local tmp = t[p]
    local i = p
    local j = i + 1
    while j <= q do
        if tmp >= t[j] then
            t[j], t[i+1] = t[i+1], t[j]
            i = i + 1
        end
        j = j + 1
    end
    t[i], t[p] = t[p], t[i]
    return i
end

local function quicksort(t, p, q)
    if q <= p then return end
    local pivot = partition(t, p, q)
    quicksort(t, p, pivot-1)
    quicksort(t, pivot+1, q)
end

quicksort(arr, 1, #arr)

for k, v in ipairs(arrs) do
    print(k .. ": " .. v)
end

io.input():close()
io.input(old_input)
