/**
 Program runs build/server and reruns should it crash unexpectedly.  It will close build/server,
 and close when a SIGTERM is sent to itself.  It is unaffected by SIGHUP.
 **/

#include <boost/process.hpp>
#include <iostream>
#include <signal.h>
#include <map>
#include <string>
#include <unistd.h>
using namespace boost::process;
std::map<int, std::string> signal_names;
std::fstream mainserverlog("server.log", std::ofstream::app);
child * cptr = nullptr;
bool keep_looping = true;

void report_and_continue(int signal) {
	mainserverlog << "[" << getpid() << "] Caught signal " << signal_names[signal] << std::endl << std::flush;
}
void report_and_exit(int signal) {
	try {
		mainserverlog << "[" << getpid() << "] Caught signal " << signal_names[signal] << "." << std::endl;
		if (cptr) {
			const int cid = cptr->id();
			mainserverlog << "[" << getpid() << "] Sending sub process (" << cid << ") the TERM signal..." << std::endl;
			// the kill call ensures the process exists
			if (kill(cid, SIGTERM) == 0) {
				mainserverlog << "[" << getpid() << "] waiting for " << cid << " to close..." << std::flush;
				cptr->wait();
			}
			cptr = nullptr;
			mainserverlog << "closed.";
		}
		mainserverlog << "  Exiting." << std::endl;
		keep_looping = false;
	} catch (...) {}
	exit(0);
}
void set_to_exit(int signal) {
	if (cptr) {
		kill(SIGTERM, cptr->id());
	}
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

int main() {
	mainserverlog << "[" << getpid() <<  "] Starting Master Server" << std::endl;

	init_signal_names();
	set_signal_handlers();

	{
		std::ofstream pidfile("server.pid");
		pidfile << getpid() << std::endl;
		pidfile.close();
	}


	cptr = nullptr;
	try {
		while (keep_looping) {
			ipstream pipe_stream;
			std::string line;

			std::fstream subserverlog("subserver.log", std::fstream::app);
			child c("node build/server.js", std_out > pipe_stream);
			cptr = &c;
			{
				std::ofstream pidfile("subserver.pid");
				pidfile << c.id() << std::endl;
			}

			mainserverlog << "["<< getpid()  << "] Running node build/server.js [" << c.id() << "]" << std::endl;
			while (keep_looping && c.running()) {
				while (keep_looping && c.running() && pipe_stream && std::getline(pipe_stream, line) && !line.empty()) {
					subserverlog << "[" << c.id() << "]" << line << std::endl;
				}
			}

			mainserverlog << "The subserver PID is " << (c.running() ? "" : "not ") <<  "running" << std::endl;
			sleep(10);
			c.wait();
			mainserverlog << "Process " << c.id() << " exited with status " << c.exit_code() << std::endl;
			cptr = nullptr;
		}
	} catch (const boost::process::process_error& e) {
		mainserverlog << "Process exception: " << e.what() << ".  Code:" << e.code() << std::endl;
		if (cptr) {
			cptr->wait();
		}
	}
	cptr = nullptr;
	unlink("subserver.pid");
	unlink("server.pid");
	mainserverlog << "[" << getpid() << "] Exiting Master Server: " << std::endl;
}