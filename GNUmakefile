all: runforever runforever-dbg

runforever.o: src/runforever.cpp
	g++ src/runforever.cpp -c -I /usr/local/src/boost_1_76_0

runforever-dbg.o: src/runforever.cpp
	g++ src/runforever.cpp -ggdb -c -o runforever-dbg.o -I /usr/local/src/boost_1_76_0
	
runforever: runforever.o
	g++ runforever.o -o runforever -L /usr/local/src/boost_1_76_0/stage/lib -static -lboost_thread -lboost_system -lpthread

syntax:
	g++ -fsyntax-only src/runforever.cpp  -I /usr/local/src/boost_1_76_0 -L /usr/local/src/boost_1_76_0/stage/lib -static -lboost_thread -lpthread

runforever-dbg: runforever-dbg.o
	g++ -ggdb runforever-dbg.o -o runforever-dbg -L /usr/local/src/boost_1_76_0/stage/lib -static -lboost_thread -lboost_system -lpthread
	
.PHONY: syntax all