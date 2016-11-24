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
    return top; //just return the origin args
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

static int call_func(lua_State *L)
{
    lua_pushcfunction(L, print_args);
    lua_pushboolean(L, 1);
    lua_pushstring(L, "welcome");
    lua_pushnumber(L, 12);
    lua_call(L, 3, 2);
    return 2;
}

static int my_cclosure(lua_State *L)
{
    /*
    printf("type of upvalue 1: %s\n",
            lua_typename(L, lua_type(L, lua_upvalueindex(1))));
    printf("type of upvalue 2: %s\n",
            lua_typename(L, lua_type(L, lua_upvalueindex(2))));
    printf("the stack size of my_cclosure is: %d\n", lua_gettop(L));
    */
    if (lua_gettop(L) < 1) {
        printf("too few args\n");
        return 0;
    }
    printf("type of arg 1: %s\n",
            lua_typename(L, lua_type(L, 1)));
    lua_Number num = lua_tonumber(L, lua_upvalueindex(2));
    num += 0.5;
    lua_pushnumber(L, num);
    lua_replace(L, lua_upvalueindex(2));
    lua_getfield(L, lua_upvalueindex(1), "x"); /* get old t["x"] */
    lua_pushvalue(L, 1); /* make a copy of arg 1 */
    lua_setfield(L, lua_upvalueindex(1), "x"); /* t["x"] = arg 1 */
    lua_pushvalue(L, lua_upvalueindex(2)); /* make a copy of upvalue 2 */
    lua_remove(L, 1); /* remove the arg 1 */
    return 2;
}

static int get_closure(lua_State *L)
{
    lua_settop(L, 0); /* clean up the stack */
    lua_createtable(L, 2, 0); /* create a table */
    lua_pushstring(L, "haha");
    lua_pushboolean(L, 0);
    lua_rawseti(L, 1, 1); /* set value: t[1] = false */
    lua_rawseti(L, 1, 2); /* set value: t[2] = "haha" */
    lua_pushnumber(L, 3.14); /* push 3.14 */
    /* printf("before pushcclosure, the size of get_closure is: %d\n", lua_gettop(L)); */
    lua_pushcclosure(L, my_cclosure, 2); /* 2 upvalues: {[1]=false, [2]="haha"}, 3.14 */
    /* printf("after pushcclosure, the stack size of get_closure is: %d\n", lua_gettop(L)); */
    return 1;
}

int luaopen_teststack(lua_State *L)
{
    lua_register(L, "print_args", print_args);
    lua_register(L, "multi_return", multi_return);
    lua_register(L, "return_table", return_table);
    lua_register(L, "get_value", get_value);
    lua_register(L, "print_elements", print_elements);
    lua_register(L, "call_func", call_func);
    lua_register(L, "get_closure", get_closure);
    return 0;
}
