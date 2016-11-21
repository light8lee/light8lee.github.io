#include <stdio.h>
#include <lua.h>
#include <lauxlib.h>
#include <lualib.h>

static int hello_world(lua_State *L)
{
    printf("hello world\n");
    return 0;
}

int luaopen_hello(lua_State *L)
{
    lua_register(L, "hello_world", hello_world);
    return 0;
}
