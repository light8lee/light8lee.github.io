local function shellsort(t)
    local increament = #t // 2
    local i
    local j
    while increament > 0 do
        i = increament
        while i <= #t do
            local tmp = t[i]
            j = i
            while j > increament do
                if tmp < t[j-increament] then
                    t[j] = t[j - increament]
                else
                    break
                end
                j = j - increament
            end
            t[j] = tmp
            i = i + 1
        end
        increament = increament // 2
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

shellsort(arrs)

for k, v in ipairs(arrs) do
    print(k .. ": " .. v)
end
f:close()
