#include <stdio.h>
#include <lua.h>
#include <lauxlib.h>
#include <lualib.h>

static int print_args(lua_State *L)
{
    int top = lua_gettop(L); /*get stack size*/
    for (int i = 1; i <= top; ++i) {
        int t = lua_type(L, i); /*get the type of element at index `i`*/
        switch (t) {
            case LUA_TSTRING: /*strings*/
                printf("%s ", lua_tostring(L, i));
                break;
            case LUA_TBOOLEAN:
                printf(lua_toboolean(L, i) ? "true, ": "false, ");
                break;
            case LUA_TNUMBER:
                printf("%g ", lua_tonumber(L, i));
                break;
            default:
                printf("%s ", lua_typename(L, t));
                break;
        }
    }
    printf("\n");
    return 0; //discard the element in the stack
}

static int multi_return(lua_State *L)
{
    lua_settop(L, 0); /* remove all stack elements */
    lua_pushnumber(L, 123.0); /* index 1 (or -3)*/
    lua_pushstring(L, "wooo"); /* index 2 (or -2) */
    lua_pushboolean(L, 0); /* index 3 (or -1) */
    return 3; /* return 123.0, wooo, false */
}

int luaopen_teststack(lua_State *L)
{
    lua_register(L, "print_args", print_args);
    lua_register(L, "multi_return", multi_return);
    return 0;
}
