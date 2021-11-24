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
#include <functional>
#include <memory>

const char * page_server_cmd="node build/server.js";
const char * promoter_server_cmd="node .servers-build/promoter.js";
const std::string primary_search_location =  ".servers-build/relayserver.js";
const std::string secondary_search_location = "src/server/relayserver.js";

const std::string cmds[3] = {page_server_cmd, promoter_server_cmd, primary_search_location}; 

const char * rfc_2822_format = "%a, %d %b %Y %T %z";
const char * RUNFOREVER_MANAGER_VERSION_STRING = "Runforever Manager/0.0";
const bool verbose = false;

namespace beast = boost::beast;     // from <boost/beast.hpp>
namespace http = beast::http;       // from <boost/beast/http.hpp>
namespace net = boost::asio;        // from <boost/asio.hpp>
using tcp = net::ip::tcp;           // from <boost/asio/ip/tcp.hpp>
using namespace boost::process;
using namespace std;
std::map<int, std::string> signal_names;
std::fstream mainserverlog("server.log", std::ofstream::app);
child * cptr = nullptr;
bool both_running = false, keep_looping = true;
bool restart_subserver = false;
char datetime_string[200] = "";
bool verbose_threads = true;
// Performs an HTTP GET and prints the response
bool connect_to_search_server()
{
		auto const host = "127.0.0.1";
		auto const port = "2999";
		auto const target = "/ping";
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
	
		// Gracefully close the socket
		stream.socket().shutdown(tcp::socket::shutdown_both, ec);		
		return false;
}

// Performs an HTTP GET and prints the response
bool connect_to_page_server()
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

// Performs an HTTP GET and prints the response
bool connect_to_promoter_server()
{
		auto const host = "127.0.0.1";
		auto const port = "2998";
		auto const target = "/getPromoted";
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
	report_and_continue(signal);
	mainserverlogline() << "Caught signal " << signal_names[signal] << "." << std::endl;
	if (cptr) {	
		kill(cptr->id(), SIGTERM);
	}
	keep_looping = false;
}

void report_and_set_process_closed(int signal) {
	report_and_continue(signal);
	both_running = false;
}

void init_signal_names() {
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


	signal_names[SIGABRT] = "SIGABRT";
	signal_names[SIGALRM] = "SIGALRM";
	signal_names[SIGKILL] = "SIGKILL";

}

// These are and should only be used in the forward_log thread...
ipstream *page_server_pipe_stream = nullptr, *search_server_pipe_stream = nullptr;
ipstream *promoter_server_pipe_stream = nullptr;
std::ofstream subserverlog, searchserverlog, promoterserverlog;
child * page_server_ptr, * search_server_ptr, *promoter_server_ptr;
void forward_log(ipstream& ps, std::ostream& log, const boost::process::child* cptr) {
	time_t t;
	struct tm *tmp;
	
	std::string line;
	char c;
	while (both_running) {
		if (verbose_threads)
			cerr << "forwarding log" << endl;
		
		boost::this_thread::yield();
		try {
			boost::this_thread::sleep_for(boost::chrono::milliseconds(10));
			if (keep_looping && ps && std::getline(ps, line) && !line.empty()) {
				log << "[" << cptr->id() << "; " << datetime_string << "] " << line << std::endl;
			}
		} catch (...) {
			
		}
	}
}

void forward_page_log(){
	forward_log(*page_server_pipe_stream, subserverlog, page_server_ptr);
}

void forward_search_log() {
	forward_log(*search_server_pipe_stream, searchserverlog, search_server_ptr);
}

void forward_promoter_log() {
	forward_log(*promoter_server_pipe_stream, promoterserverlog, promoter_server_ptr);
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
		if (verbose_threads)
			cerr << "keeping time..." << endl;
		
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
		if (restart_subserver || connect_to_page_server()) {
			restart_subserver = true;
		}
		boost::this_thread::sleep_for(boost::chrono::seconds(3));
	}
}
std::string search_server_location;
std::string search_server_cmd;

class pidfile {
	char const * filename;
public:
	pidfile(char const * const p_filename, pid_t const p_id) : filename(p_filename) {
		std::ofstream fs(p_filename);
		fs << p_id << std::endl;
		fs.close();
	}
	
	~pidfile(){
		unlink(filename);
	}
};

void mind_page_server(child ** child_ptr_ptr) {
	while (keep_looping && both_running) {
		if (verbose_threads)
			cerr << "minding page server" << endl;
		
		if (connect_to_page_server()) {
			mainserverlogline() << "Could not get a page from page subserver" << std::endl;
			break;
		}
		
		if (!(*child_ptr_ptr)->running()) {
			break;
		}
		
		boost::this_thread::sleep_for(boost::chrono::seconds(1));
	}
	both_running = false;
}

void mind_search_server(child ** child_ptr_ptr) {
	while (keep_looping && both_running && *child_ptr_ptr != nullptr) {
		if (verbose_threads)
			cerr << "minding search server" << endl;
		child& search_server = **child_ptr_ptr;
		boost::this_thread::sleep_for(boost::chrono::seconds(5));
		if (connect_to_search_server()) {
			mainserverlogline() << "Could not connect to search subserver" << std::endl;
			break;
		}
		
		if (!search_server.running()) {
			break;
		}
		
		boost::this_thread::sleep_for(boost::chrono::seconds(1));
		
	}
	
	both_running = false;
}

void mind_promoter_server(child ** child_ptr_ptr) {
	while (keep_looping && both_running && child_ptr_ptr != nullptr) {
		if (verbose_threads)
			cerr << "minding promoter server" << endl;
		child& promoter = **child_ptr_ptr;
		if (connect_to_promoter_server()) {
			mainserverlogline() << "Could not connect to promoter server" << std::endl;
		}
		
		if (!promoter_server_ptr->running()) {
			break;
		}
		
		boost::this_thread::sleep_for(boost::chrono::seconds(1));
	}
	
	both_running = false;
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
		
		if (access((search_server_location=primary_search_location).c_str(), R_OK)
			&&
		   access((search_server_location=secondary_search_location).c_str(), R_OK) 
			
			
			) {
			std::cerr << "Cannot find build/relayserver.js or src/server/relayserver.js to run." << std::endl;
			keep_looping = false;
		} else {
			search_server_cmd = "node " + search_server_location;
		}
		
		if (access(".servers-build/promoter.js", R_OK)) {
			std::cerr << "Cannot find promoter.js to run." << std::endl;
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
	signal(SIGABRT, report_and_set_process_closed);
	pidfile masterserver("manager.pid", getpid());
	
	
	for (;keep_looping;) {
		
		std::cerr << "Checking for errant servers running..." << std::endl;
		
		if (!connect_to_search_server()) {
			std::cerr << "Search server already running.  Close this process." << std::endl;
			keep_looping = false;
		}
		
		if (!connect_to_page_server()) {
			std::cerr << "Page server already running.  Close this process." << std::endl;
			keep_looping = false;
		}
		
		if (!connect_to_promoter_server()) {
			std::cerr << "Promoter server already running.  Close this process." << std::endl;
			keep_looping = false;
		}
		
		if (!keep_looping) {
			exit(1);
		}
		
		
		std::cerr << "Check Succeeded" << std::endl;
		if (promoter_server_pipe_stream) {
			delete promoter_server_pipe_stream;
		}
		promoter_server_pipe_stream = new ipstream();
		promoter_server_ptr = new child(promoter_server_cmd, std_out > *promoter_server_pipe_stream);
		if (page_server_pipe_stream) {
			delete page_server_pipe_stream;			
		}
		page_server_pipe_stream = new ipstream();
		page_server_ptr = new child(page_server_cmd, std_out > *page_server_pipe_stream);		
		if (search_server_pipe_stream) {
			delete search_server_pipe_stream;
		}
		search_server_pipe_stream = new ipstream();
		search_server_ptr = new child(search_server_cmd, std_out > *search_server_pipe_stream);
		
		
		pidfile search_pidfile("search.pid", search_server_ptr->id());
		pidfile page_pidfile("page.pid", page_server_ptr->id());
		pidfile promoter_pidfile("promoter.pid", promoter_server_ptr->id());
		
		mainserverlogline() << "Running " << page_server_cmd << " [" << page_server_ptr->id() << "]" << std::endl;
		mainserverlogline() << "Running " << search_server_cmd << " [" << search_server_ptr->id() << "]" << std::endl;
		mainserverlogline() << "Running " << promoter_server_cmd << " [" << promoter_server_ptr->id() << "]" << std::endl;
		child& page_server = *page_server_ptr;
		child& search_server = *search_server_ptr;
		child& promoter_server_cmd = *promoter_server_ptr;
		
		both_running = true;
		
		boost::this_thread::yield();
		std::string line;

		current_directory_writable = access(".", W_OK) == 0;
		subserverlog.open("subserver.log", std::fstream::app);
		searchserverlog.open("search.log", std::fstream::app);
		promoterserverlog.open("promoter.log", std::fstream::app);
		cptr = &page_server;

		boost::thread log_page_forwarding([&](){forward_log(*page_server_pipe_stream, subserverlog, page_server_ptr);});
		boost::thread log_search_forwarding(forward_search_log);
		boost::thread log_promoter_forwarding(forward_promoter_log);
		
		
		boost::this_thread::sleep_for(boost::chrono::seconds(10));
		
		boost::thread minding_search_server([&](){mind_search_server(&search_server_ptr);});
		boost::thread minding_page_server([&](){mind_page_server(&page_server_ptr);});
		boost::thread minding_promoter_server([&](){mind_promoter_server(&promoter_server_ptr);});
		
		int col = 0;
		try {
			while (both_running) {
				boost::this_thread::sleep_for(boost::chrono::seconds(5));
			} // while
		} catch (const boost::process::process_error& e) {
			mainserverlogline() << "Process exception: " << e.what() << ".  Code:" << e.code() << std::endl;
		}
		kill(page_server.id(), SIGKILL);					
		page_server.wait();
		mainserverlogline() << "Process page server  " << page_server.id() << " exited with status " << page_server.exit_code() << std::endl;
		kill(search_server.id(), SIGKILL);
		search_server.wait();
		kill(promoter_server_ptr->id(), SIGKILL);
		promoter_server_ptr->wait();
		
		log_page_forwarding.join();
		log_search_forwarding.join();
		log_promoter_forwarding.join();
		
		mainserverlogline() << "Process search server " << search_server.id() << " exited with status " << page_server.exit_code() << std::endl;
		mainserverlogline() << "Process Promoter server " << promoter_server_ptr->id() << " exited with status " << promoter_server_ptr->exit_code() << std::endl;
		
		subserverlog.close();
		searchserverlog.close();
		promoterserverlog.close();
		
		page_server_pipe_stream->close();
		search_server_pipe_stream->close();
		promoter_server_pipe_stream->close();
		
		delete search_server_ptr;
		delete page_server_ptr;
		delete promoter_server_ptr;
	
		promoter_server_ptr = search_server_ptr = page_server_ptr = nullptr;
	}
	unlink("manager.pid");
	mainserverlogline() << "Exiting Master Server" << std::endl;
}