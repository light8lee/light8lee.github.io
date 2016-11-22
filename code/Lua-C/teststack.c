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

static int return_table(lua_State *L)
{
    lua_newtable(L);
    lua_pushinteger(L, 1); /* key: 1 */
    lua_pushstring(L, "hello world from C\n"); /* value: "hello world from C\n" */
    lua_settable(L, -3); /* table is at index: -3 */
    return 1; /* return the table */
}

static int get_value(lua_State *L)
{
    if (!lua_istable(L, -1)) { /* if there is not a table on the stack */
        printf("no table\n");
        return 0;
    }
    lua_pushstring(L, "hi"); /* the key is "hi" */
    lua_gettable(L, -2);
    return 1; /* return the value */
}

static int print_elements(lua_State *L)
{
    if (!lua_istable(L, 1)) { /* if there is not a table at index 1 */
        printf("no table\n");
        return 0;
    }
    lua_pushnil(L); /* first key */
    while (lua_next(L, 1) != 0) {
        printf("%s - %s\n", lua_typename(L, lua_type(L, -2)),
                lua_typename(L, lua_type(L, -1)));
        lua_pop(L, 1); /* removes value; keeps key for next iteration */
    }
    return 0;
}

int luaopen_teststack(lua_State *L)
{
    lua_register(L, "print_args", print_args);
    lua_register(L, "multi_return", multi_return);
    lua_register(L, "return_table", return_table);
    lua_register(L, "get_value", get_value);
    lua_register(L, "print_elements", print_elements);
    return 0;
}
