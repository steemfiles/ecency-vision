/**
 Program runs build/server and reruns should it crash unexpectedly.  It will close build/server,
 and close when a SIGTERM is sent to itself.  It is unaffected by SIGHUP.
 **/

#include <boost/process.hpp>
#include <boost/thread.hpp>
#include <iostream>
#include <signal.h>
#include <map>
#include <string>
#include <unistd.h>
#include <memory>
#include <functional>
#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/version.hpp>
#include <boost/asio/connect.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <cstdlib>
#include <iostream>
#include <string>
#include <sys/time.h>

const char * rfc_2822_format = "%a, %d %b %Y %T %z";
const char * RUNFOREVER_MANAGER_VERSION_STRING = "Runforever Manager/0.0";
const bool verbose = false;
namespace beast = boost::beast;     // from <boost/beast.hpp>
namespace http = beast::http;       // from <boost/beast/http.hpp>
namespace net = boost::asio;        // from <boost/asio.hpp>
using tcp = net::ip::tcp;           // from <boost/asio/ip/tcp.hpp>
using namespace boost::process;

std::map<int, std::string> signal_names;
std::fstream mainserverlog("server.log", std::ofstream::app);
child * cptr = nullptr;
bool keep_looping = true;
bool restart_subserver = false;
char datetime_string[200] = "";


// Performs an HTTP GET and prints the response
bool connect_to_subserver()
{
		auto const host = "127.0.0.1";
		auto const port = "3000";
		auto const target = "/";
		const int version = 11;
		boost::system::error_code ec;
	
		// The io_context is required for all I/O
		net::io_context ioc;
	
		// These objects perform our I/O
		tcp::resolver resolver(ioc);
		beast::tcp_stream stream(ioc);
	
		// Look up the domain name
		auto const results = resolver.resolve(host, port);
	
		// Make the connection on the IP address we get from a lookup
		stream.connect(results, ec);		
		if (ec)
			return true;
	    
		// Set up an HTTP GET request message
		http::request<http::string_body> req{http::verb::get, target, version};
		req.set(http::field::host, host);
		req.set(http::field::user_agent, RUNFOREVER_MANAGER_VERSION_STRING);
	    
		// Send the HTTP request to the remote host
		http::write(stream, req);
	    
		// This buffer is used for reading and must be persisted
		beast::flat_buffer buffer;
	    
		// Declare a container to hold the response
		http::response<http::dynamic_body> res;
	    
		// Receive the HTTP response
		http::read(stream, buffer, res);
				
		// Gracefully close the socket
		stream.socket().shutdown(tcp::socket::shutdown_both, ec);
        
		if (ec)
			return true;
		else 
			return false;
}

std::ostream& mainserverlogline() {
	int cid;
	mainserverlog << "[" << getpid();
	if (!strcmp(datetime_string,"")) {
		// not set yet?
		time_t t;
		struct tm *tmp;
		
		(t = time(NULL)) != ((time_t)-1) &&
		(tmp = localtime(&t)) != NULL &&		    	
		(strftime(datetime_string, sizeof(datetime_string), rfc_2822_format, tmp) != 0);		
	}
	mainserverlog << "; " << datetime_string;
	return mainserverlog << "] ";
}

void report_and_continue(int signal) {
	mainserverlogline() << "Caught signal " << signal_names[signal] << "." << std::endl;
}

void set_to_exit(int signal) {
	mainserverlogline() << "Caught signal " << signal_names[signal] << "." << std::endl;
	if (cptr) {	
		kill(cptr->id(), SIGTERM);
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

// These are and should only be used in the forward_log thread...
ipstream * pipe_stream_ptr = nullptr;
std::ofstream subserverlog; 
void forward_log() {
	time_t t;
	struct tm *tmp;
	
	std::string line;
	while (keep_looping) {
		boost::this_thread::yield();
		boost::this_thread::sleep_for(boost::chrono::milliseconds(10));
		if (keep_looping && pipe_stream_ptr && *pipe_stream_ptr && std::getline(*pipe_stream_ptr, line) && !line.empty()) {
			subserverlog << "[" << cptr->id() << "; " << datetime_string << "] " << line << std::endl;
		}
	}
}

void keep_time() {
	time_t t;
	struct tm *tmp;
	t = time(NULL);
	// start on the the new second boundary --- just to be exact in time.
	while (t == time(NULL)) {
		boost::this_thread::sleep_for(boost::chrono::milliseconds(1));
	}
	while (keep_looping) {
		if ((t = time(NULL)) != ((time_t)-1)) {
			
			(tmp = localtime(&t)) != NULL &&		    	
			(strftime(datetime_string, sizeof(datetime_string), rfc_2822_format, tmp) != 0);
			
			// resynchronize every 30 minutes
			if (t % 1'800 == 0) {
				// In tests time would drift 0.3 ms/s.
				// So a half hour of waiting a second will only leave us 0.5 s off the correct mark.
				struct timeval tv;
				struct timezone tz;
				gettimeofday(&tv, &tz);
				boost::this_thread::sleep_for(boost::chrono::microseconds(1'000'000-tv.tv_usec));
				continue;
			}
		}
		boost::this_thread::sleep_for(boost::chrono::milliseconds(1000));
	}
}

void check_connectivity() {
	while (keep_looping) {
		if (restart_subserver || connect_to_subserver()) {
			restart_subserver = true;
		}
		boost::this_thread::sleep_for(boost::chrono::seconds(3));
	}
}

int main() {
	bool current_directory_writable = access(".", W_OK) == 0;
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
	
	boost::thread keeping_time(keep_time);

	mainserverlogline() << "Starting Manager" << std::endl;

	init_signal_names();

	// Block certain signals for this process
	signal(SIGBUS, set_to_exit);
	signal(SIGHUP, report_and_continue);
	signal(SIGINT, set_to_exit);
	signal(SIGTERM, set_to_exit);
	
	// Store the server PID.
	{
		std::ofstream pidfile("server.pid");
		pidfile << getpid() << std::endl;
	}

	cptr = nullptr;
	while (keep_looping) {
		boost::this_thread::yield();
		try {
			std::string line;

			current_directory_writable = access(".", W_OK) == 0;
			subserverlog.open("subserver.log", std::fstream::app);
			pipe_stream_ptr = new ipstream();

			child c("node build/server.js", std_out > *pipe_stream_ptr);
			
			cptr = &c;
			{
				std::ofstream pidfile("subserver.pid");
				pidfile << c.id() << std::endl;
			}

			mainserverlogline() << "Running node build/server.js [" << c.id() << "]" << std::endl;
			boost::thread log_forwarding(forward_log);
			int col = 0;
			while (keep_looping && c.running() && !restart_subserver) {
				boost::this_thread::sleep_for(boost::chrono::seconds(5));
				if (verbose){
					for (int k = 0; k < col; ++k) 
						std::cerr << " ";
					std::cerr << "X" << std::endl << std::flush;
					++col;
					col = col % 10;
				}
				if (connect_to_subserver()) {
					mainserverlogline() << "Could not get a page from subserver" << std::endl;
					restart_subserver = true;
				}
			}
			// what happened
			if (!keep_looping) {
				mainserverlogline() << "Manager process closing" << std::endl;
			} else if (!c.running()) {
				mainserverlogline() << "Subserver process closed" << std::endl;
			} else {
				mainserverlogline() << "Restarting subserver process" << std::endl;
			}
			if (c.running()) {
				mainserverlogline() << "Sending the subserver the TERM signal..." << std::flush;
				if (kill(c.id(), SIGTERM)) {
					mainserverlog << "failed with " << strerror(errno);
				} else {
					mainserverlog << "done";
				}
				mainserverlog << "." << std::endl;
			}
			log_forwarding.interrupt();
			mainserverlogline() << "The subserver (PID " << c.id() << ") is " << (c.running() ? "" : "not ") <<  "running" << std::endl;
			boost::this_thread::sleep_for(boost::chrono::seconds(10));
			mainserverlogline() << "Sending the subserver the KILL signal..." << std::flush;
			if (kill(c.id(), SIGKILL) != 0) {
				mainserverlog << "failed with " << strerror(errno) << std::endl;
			} else {
				mainserverlog << "done";
			}
			mainserverlog << '.' << std::endl;
			c.wait();
			mainserverlogline() << "Process " << c.id() << " exited with status " << c.exit_code() << std::endl;
			restart_subserver = false;
			cptr = nullptr;
		} catch (const boost::process::process_error& e) {
			mainserverlogline() << "Process exception: " << e.what() << ".  Code:" << e.code() << std::endl;
		}
		subserverlog.close();
	} // while
	cptr = nullptr;
	if (current_directory_writable) {
		unlink("subserver.pid");
		unlink("server.pid");
	}
	mainserverlogline() << "Exiting Master Server" << std::endl;
}