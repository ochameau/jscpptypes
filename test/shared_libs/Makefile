all: libcpp-x86.so libcpp-x86_64.so libc-x86.so libc-x86_64.so

libcpp-x86.so: lib.cpp
	g++ -m32 -fPIC -shared -o libcpp-x86.so lib.cpp

libcpp-x86_64.so: lib.cpp
	g++ -m64 -fPIC -shared -o libcpp-x86_64.so lib.cpp

libc-x86.so: lib.c
	gcc -m32 -fPIC -shared -o libc-x86.so lib.c

libc-x86_64.so: lib.c
	gcc -m64 -fPIC -shared -o libc-x86_64.so lib.c

clean:
	rm libc*.so

