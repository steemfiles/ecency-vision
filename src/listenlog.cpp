/**
 Program runs build/server and reruns should it crash unexpectedly.  It will close build/server,
 and close when a SIGTERM is sent to itself.  It is unaffected by SIGHUP.
 **/

#include <iostream>
#include <signal.h>
#include <map>
#include <string>
#include <unistd.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <fstream>

std::map<int, std::string> signal_names;
std::fstream mainserverlog("listenlog.log", std::ofstream::app);
bool keep_looping = true;

std::ostream& mainlogline() {
	return mainserverlog << "[" << getpid() <<  "] ";
}



void report_and_continue(int signal) {
	mainlogline() << "Caught signal " << signal_names[signal] << std::endl << std::flush;
}
void report_and_exit(int signal) {
	try {
		mainlogline() << "Caught signal " << signal_names[signal] << "." << std::endl;
		mainserverlog << "  Exiting." << std::endl;
		keep_looping = false;
	} catch (...) {}
	exit(0);
}
void set_to_exit(int signal) {
	keep_looping = false;
}


void init_signal_names() {
	signal_names[SIGABRT] = "SIGABRT";
	signal_names[SIGALRM] = "SIGALRM";
	signal_names[SIGBUS] = "SIGBUS";
	signal_names[SIGCHLD] = "SIGCHLD";
	signal_names[SIGCLD] = "SIGCLD";
	signal_names[SIGCONT] = "SIGCONT";
	//signal_names[SIGEMT] = "SIGEMT";
	signal_names[SIGFPE] = "SIGFPE";
	signal_names[SIGHUP] = "SIGHUP";
	signal_names[SIGILL] = "SIGILL";
	//signal_names[SIGINFO] = "SIGINFO";
	signal_names[SIGINT] = "SIGINT";
	signal_names[SIGIO] = "SIGIO";
	signal_names[SIGIOT] = "SIGIOT";
	signal_names[SIGKILL] = "SIGKILL";
	//signal_names[SIGLOST] = "SIGLOST";
	signal_names[SIGPIPE] = "SIGPIPE";
	signal_names[SIGPOLL] = "SIGPOLL";
	signal_names[SIGPROF] = "SIGPROF";
	signal_names[SIGPWR] = "SIGPWR";
	signal_names[SIGQUIT] = "SIGQUIT";
	signal_names[SIGSEGV] = "SIGSEGV";
	signal_names[SIGSTKFLT] = "SIGSTKFLT";
	signal_names[SIGSTOP] = "SIGSTOP";
	signal_names[SIGTSTP] = "SIGTSTP";
	signal_names[SIGSYS] = "SIGSYS";
	signal_names[SIGTERM] = "SIGTERM";
	signal_names[SIGTRAP] = "SIGTRAP";
	signal_names[SIGTTIN] = "SIGTTIN";
	signal_names[SIGTTOU] = "SIGTTOU";
	//signal_names[SIGUNUSED] = "SIGUNUSED";
	signal_names[SIGURG] = "SIGURG";
	signal_names[SIGUSR1] = "SIGUSR1";
	signal_names[SIGUSR2] = "SIGUSR2";
	signal_names[SIGVTALRM] = "SIGVTALRM";
	signal_names[SIGXCPU] = "SIGXCPU";
	signal_names[SIGXFSZ] = "SIGXFSZ";
	signal_names[SIGWINCH] = "SIGWINCH";
}

void set_signal_handlers() {
	signal(SIGBUS, report_and_exit);
	// Don't install handlers for the following signals
	// because it is used by the process library:
	// SIGCLD
	signal(SIGHUP, report_and_continue);
	signal(SIGTERM, report_and_exit);
}

#include <sys/socket.h>
#include <sys/un.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#define MY_SOCK_PATH "/somepath"
#define LISTEN_BACKLOG 50

#define handle_error(msg) \
   do { perror(msg); exit(EXIT_FAILURE); } while (0)


int main() {
	bool current_directory_writable;
	// Check that this program can do everything it needs to do
	{
		bool all_checked_files_exist = true;
		// Some checks
		for (const char * file_name : {"listenlog.pid", "listenlog.log"
		                              }
		    ) {
			bool file_name_exists = access(file_name, F_OK)==0;
			all_checked_files_exist = all_checked_files_exist && file_name_exists;
			if (file_name_exists && access(file_name, W_OK)) {
				std::cerr << file_name << " exists but is not writable" << std::endl;
				keep_looping = false;
			}
		} // for

		current_directory_writable = access(".", W_OK) == 0;

		if (!all_checked_files_exist) {
			if (!current_directory_writable) {
				std::cerr << "Current directory not writable" << std::endl;
				keep_looping = false;
			}
		}
	}

	if (!keep_looping) {
		exit(0);
	}

	mainlogline() << "Starting Listen Logger" << std::endl;

	init_signal_names();
	set_signal_handlers();

	// Store the server PID.
	{
		std::ofstream pidfile("listenlog.pid");
		pidfile << getpid() << std::endl;
	}

       {
           int sfd, cfd;
           struct sockaddr_un my_addr, peer_addr;
           socklen_t peer_addr_size;

           sfd = socket(AF_INET, SOCK_STREAM, 6);
           if (sfd == -1)
               handle_error("socket");

           memset(&my_addr, 0, sizeof(struct sockaddr_un));
                               /* Clear structure */
           my_addr.sun_family = AF_INET;
           my_addr.sin_port = htons(1457);          

           if (bind(sfd, (struct sockaddr *) &my_addr,
                   sizeof(struct sockaddr_un)) == -1)
               handle_error("bind");

           if (listen(sfd, LISTEN_BACKLOG) == -1)
               handle_error("listen");

           /* Now we can accept incoming connections one
              at a time using accept(2) */

           peer_addr_size = sizeof(struct sockaddr_un);
           cfd = accept(sfd, (struct sockaddr *) &peer_addr,
                        &peer_addr_size);
           if (cfd == -1)
               handle_error("accept");

           /* Code to deal with incoming connection(s)... */

           /* When no longer required, the socket pathname, MY_SOCK_PATH
              should be deleted using unlink(2) or remove(3) */
       }
	try {
		
	} catch (const std::runtime_error& e) {
		mainserverlog << "Process exception: " << e.what() << "." << std::endl;
	}
	if (current_directory_writable) {
		unlink("listenlog.pid");
	}
	mainlogline() << "Exiting Master Server" << std::endl;
}