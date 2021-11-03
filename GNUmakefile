COMPILE_FLAGS=-std=c++17 -I /usr/local/src/boost_1_76_0
LINK_FLAGS=-std=c++17 -L /usr/local/src/boost_1_76_0/stage/lib  -lboost_thread -lboost_system -lpthread -lboost_chrono

debug: runforever-dbg .servers-build/relayserver.js .servers-build/promoter.js

production: .servers-build/runforever .servers-build/runforever-dyn .servers-build/relayserver.js .servers-build/promoter.js

runforever.o: src/runforever.cpp
	g++ src/runforever.cpp -c $(COMPILE_FLAGS)

runforever-dbg.o: src/runforever.cpp
	g++ src/runforever.cpp -ggdb -c -o runforever-dbg.o  $(COMPILE_FLAGS)

listenlog-dbg.o: src/listenlog.cpp
	g++ src/listenlog.cpp -ggdb -c -o listenlog-dbg.o  $(COMPILE_FLAGS)
	
.servers-build/runforever: runforever.o
	g++ runforever.o -o .servers-build/runforever $(LINK_FLAGS) -static

.servers-build/runforever-dyn: runforever.o 
	g++ runforever.o -o .servers-build/runforever-dyn $(LINK_FLAGS)

syntax:
	g++ -fsyntax-only src/runforever.cpp $(COMPILE_FLAGS)

runforever-dbg: runforever-dbg.o
	g++ -ggdb runforever-dbg.o -o runforever-dbg  $(LINK_FLAGS) -static
	
listenlog-dbg: listenlog-dbg.o
	g++ -ggdb listenlog-dbg.o -o listenlog-dbg  $(LINK_FLAGS) -static

.servers-build/relayserver.js: src/server/relayserver.ts
	tsc --OutDir .servers-build src/server/relayserver.ts
	
.servers-build/promoter.js: src/server/promoter.ts
	tsc --OutDir .servers-build  src/server/promoter.ts

clean:
	rm *.o runforever-dbg 
	
.PHONY: syntax production clean default