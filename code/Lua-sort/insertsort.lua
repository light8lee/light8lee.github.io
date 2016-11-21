local arrs = {}
local f = assert(io.open("sort_inputs.txt"), "r")
local j = 1
while true do
    local num = f:read("*number")
    if not num then break end
    arrs[j] = num
    j = j + 1
end

function insertion_sort(arr)
    for j = 2, #arr, 1 do
        local tmp = arr[j]
        local k = j - 1
        while k >= 1 and tmp < arr[k] do
            arr[k+1] = arr[k]
            k = k - 1
        end
        arr[k + 1] = tmp
    end
end

for k, v in ipairs(arrs) do
    print(k .. ": " .. v)
end

f:close()
