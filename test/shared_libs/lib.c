#include <stdlib.h>

long MyFunction(int *foo, int bar)
{
  return *foo + bar;
}

struct sMyStruct {
  int attr;
};
typedef struct sMyStruct MyClass;

MyClass* GetObject(int attr)
{
  MyClass* obj;
  obj = (MyClass*) malloc(sizeof(MyClass));
  obj->attr = attr;
  return obj;
}

int GetObjectAttr(MyClass *obj)
{
  return obj->attr;
}

