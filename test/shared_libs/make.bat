cl /Folibc.obj /c lib.c /nologo
link /nologo /dll /out:libc.dll /implib:fooc.lib libc.obj

cl /Folibcpp.obj /c lib.cpp /nologo
link /nologo /dll /out:libcpp.dll /implib:foocpp.lib libcpp.obj

