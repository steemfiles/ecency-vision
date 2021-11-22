COMPILE_FLAGS=-std=c++17 -I /usr/local/src/boost_1_76_0
LINK_FLAGS=-std=c++17 -L /usr/local/src/boost_1_76_0/stage/lib  -lboost_thread -lboost_system -lpthread -lboost_chrono

debug: runforever-dbg private-api/build/private-api-server.js private-api/build/relayserver.js private-api/build/relayserver.js private-api/build/pull-history-data.js private-api/build/process.js

production: private-api/build/runforever private-api/build/private-api-server.js private-api/build/runforever-dyn private-api/build/relayserver.js

runforever.o: src/runforever.cpp
	g++ src/runforever.cpp -c $(COMPILE_FLAGS)

runforever-dbg.o: src/runforever.cpp
	g++ src/runforever.cpp -ggdb -c -o runforever-dbg.o  $(COMPILE_FLAGS)

listenlog-dbg.o: src/listenlog.cpp
	g++ src/listenlog.cpp -ggdb -c -o listenlog-dbg.o  $(COMPILE_FLAGS)
	
private-api/build/runforever: runforever.o
	g++ runforever.o -o private-api/build/runforever $(LINK_FLAGS) -static

private-api/build/runforever-dyn: runforever.o 
	g++ runforever.o -o private-api/build/runforever-dyn $(LINK_FLAGS)

syntax:
	g++ -fsyntax-only src/runforever.cpp $(COMPILE_FLAGS)

runforever-dbg: runforever-dbg.o
	g++ -ggdb runforever-dbg.o -o runforever-dbg  $(LINK_FLAGS) -static
	
listenlog-dbg: listenlog-dbg.o
	g++ -ggdb listenlog-dbg.o -o listenlog-dbg  $(LINK_FLAGS) -static

private-api/build/private-api-server.js: private-api/src/private-api-server.ts private-api/src/notifications.ts
	rm -f private-api/build/src/server/private-api-server.js
	tsc --OutDir private-api/build --resolveJsonModule --esModuleInterop private-api/src/private-api-server.ts
	

private-api/build/process.js: private-api/src/process.ts private-api/src/notifications.ts
	rm -f private-api/build/process.js
	C=`tsc --OutDir private-api/build --lib es2021 --resolveJsonModule --esModuleInterop private-api/src/process.ts | wc -l`
	echo $C
	sleep 1
	
private-api/build/pull-history-data.js: private-api/src/pull-history-data.ts private-api/src/notifications.ts
	rm -f private-api/build/pull-history-data.js
	tsc --OutDir private-api/build --lib es2021 --resolveJsonModule --esModuleInterop private-api/src/pull-history-data.ts
	
private-api/build/relayserver.js: src/server/relayserver.ts
	tsc --OutDir private-api/build src/server/relayserver.ts

clean:
	rm *.o runforever-dbg 
	
.PHONY: syntax production clean default