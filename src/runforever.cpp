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

std::ostream& mainlogline() {
	return mainserverlog << "[" << getpid() <<  "] ";
}



void report_and_continue(int signal) {
	mainlogline() << "Caught signal " << signal_names[signal] << std::endl << std::flush;
}
void report_and_exit(int signal) {
	try {
		mainlogline() << "Caught signal " << signal_names[signal] << "." << std::endl;
		if (cptr) {
			const int cid = cptr->id();
			mainlogline() << "Sending sub process (" << cid << ") the TERM signal..." << std::endl;
			// the kill call ensures the process exists
			if (kill(cid, SIGTERM) == 0) {
				mainlogline() << "waiting for " << cid << " to close..." << std::flush;
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
	bool current_directory_writable;
	// Check that this program can do everything it needs to do
	{
		bool all_checked_files_exist = true;
		// Some checks
		for (const char * file_name : {"server.pid", "subserver.pid", "server.log", "subserver.log"
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

		if (access("build/server.js", R_OK)) {
			std::cerr << "Cannot find build/server.js to run." << std::endl;
			keep_looping = false;
		}
	}

	if (!keep_looping) {
		exit(0);
	}

	mainlogline() << "Starting Master Server" << std::endl;

	init_signal_names();
	set_signal_handlers();

	// Store the server PID.
	{
		std::ofstream pidfile("server.pid");
		pidfile << getpid() << std::endl;
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

			mainlogline() << "Running node build/server.js [" << c.id() << "]" << std::endl;
			while (keep_looping && c.running()) {
				while (keep_looping && c.running() && pipe_stream && std::getline(pipe_stream, line) && !line.empty()) {
					subserverlog << "[" << c.id() << "]" << line << std::endl;
				}
			}

			mainlogline() << "The subserver PID is " << (c.running() ? "" : "not ") <<  "running" << std::endl;
			sleep(10);
			c.wait();
			mainlogline() << "Process " << c.id() << " exited with status " << c.exit_code() << std::endl;
			cptr = nullptr;
		}
	} catch (const boost::process::process_error& e) {
		mainserverlog << "Process exception: " << e.what() << ".  Code:" << e.code() << std::endl;
		if (cptr) {
			cptr->wait();
		}
	}
	cptr = nullptr;
	if (current_directory_writable) {
		unlink("subserver.pid");
		unlink("server.pid");
	}
	mainlogline() << "Exiting Master Server" << std::endl;
}