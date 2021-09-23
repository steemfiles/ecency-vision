COMPILE_FLAGS=-std=c++17 -I /usr/local/src/boost_1_76_0
LINK_FLAGS=-std=c++17 -L /usr/local/src/boost_1_76_0/stage/lib  -lboost_thread -lboost_system -lpthread

debug: runforever-dbg

production: runforever runforever-dyn

runforever.o: src/runforever.cpp
	g++ src/runforever.cpp -c $(COMPILE_FLAGS)

runforever-dbg.o: src/runforever.cpp
	g++ src/runforever.cpp -ggdb -c -o runforever-dbg.o  $(COMPILE_FLAGS)
	
runforever: runforever.o
	g++ runforever.o -o runforever $(LINK_FLAGS) -static

runforever-dyn: runforever.o
	g++ runforever.o -o runforever-dyn $(LINK_FLAGS)

syntax:
	g++ -fsyntax-only src/runforever.cpp $(COMPILE_FLAGS)

runforever-dbg: runforever-dbg.o
	g++ -ggdb runforever-dbg.o -o runforever-dbg  $(LINK_FLAGS) -static
	
.PHONY: syntax production default