local i = 10
local arrs = {}
repeat
    arrs[i] = io.read("*number")
    i = i - 1
until i <= 0

function bubblesort(arr)
    for j = 1, #arr, 1 do
        for k = j+1, #arr, 1 do
            if arr[j] > arr[k] then
                arr[j], arr[k] = arr[k], arr[j]
            end
        end
    end
end

for k, v in ipairs(arrs) do
    print(k .. ": " .. v)
end
