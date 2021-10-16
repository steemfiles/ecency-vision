/** Relay an HTTP message.
    This function relays messages sent to it to SEARCH_API_ADDR
**/

#include <curl/curl.h>
#include <iostream>
#include <signal.h>
#include <map>
#include <string>
#include <unistd.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <fstream>
#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/version.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/config.hpp>
#include <boost/beast/core/stream_traits.hpp>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <string>
#include <thread>

const char * SEARCH_API_ADDR=getenv("SEARCH_API_ADDR");
const char * SEARCH_API_SECRET=getenv("SEARCH_API_SECRET");

CURL * curl;

std::map<int, std::string> signal_names;
std::fstream mainserverlog("relay.log", std::ofstream::app);
bool keep_looping = true;

std::ostream& mainlogline() {
	return mainserverlog << "[" << getpid() <<  "] ";
}

void report_and_continue(int signal) {
	mainlogline() << "Caught signal " << signal_names[signal] << "." << std::endl << std::flush;
}
void set_to_exit(int signal) {
	mainlogline() << "Caught signal " << signal_names[signal] << '.' << std::endl << std::flush;
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

namespace beast = boost::beast;         // from <boost/beast.hpp>
namespace http = beast::http;           // from <boost/beast/http.hpp>
namespace net = boost::asio;            // from <boost/asio.hpp>
using tcp = boost::asio::ip::tcp;       // from <boost/asio/ip/tcp.hpp>


template <
    class Body, class Allocator>
void
log_request(
    http::request<Body, http::basic_fields<Allocator>>&& req)
{
	std::cerr << "method:" << req.method() << std::endl;
	std::cerr << "target:" <<  req.target() << std::endl;
	std::cerr << req << std::endl;
	std::cerr << "body:" << req.body() << std::endl;
}

// Report a failure
void
fail(beast::error_code ec, char const* what)
{
    std::cerr << what << ": " << ec.message() << "\n";
}

// This is the C++11 equivalent of a generic lambda.
// The function object is used to send an HTTP message.
template<class Stream>
struct send_lambda
{
    Stream& stream_;
    bool& close_;
    beast::error_code& ec_;

    explicit
    send_lambda(
        Stream& stream,
        bool& close,
        beast::error_code& ec)
        : stream_(stream)
        , close_(close)
        , ec_(ec)
    {
    }

    template<bool isRequest, class Body, class Fields>
    void
    operator()(http::message<isRequest, Body, Fields>&& msg) const
    {
        // Determine if we should close the connection after
        close_ = msg.need_eof();

        // We need the serializer here because the serializer requires
        // a non-const file_body, and the message oriented version of
        // http::write only works with const messages.
        http::serializer<isRequest, Body, Fields> sr{msg};
        http::write(stream_, sr, ec_);
    }
};

//
// Copyright (c) 2016-2019 Vinnie Falco (vinnie dot falco at gmail dot com)
//
// Distributed under the Boost Software License, Version 1.0. (See accompanying
// file LICENSE_1_0.txt or copy at http://www.boost.org/LICENSE_1_0.txt)
//
// Official repository: https://github.com/boostorg/beast
//

//------------------------------------------------------------------------------
//
// Example: HTTP SSL client, synchronous
//
//------------------------------------------------------------------------------

#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <cstdlib>
#include <iostream>
#include <string>

namespace beast = boost::beast; // from <boost/beast.hpp>
namespace http = beast::http;   // from <boost/beast/http.hpp>
namespace net = boost::asio;    // from <boost/asio.hpp>
namespace ssl = net::ssl;       // from <boost/asio/ssl.hpp>
using tcp = net::ip::tcp;       // from <boost/asio/ip/tcp.hpp>

void write_to_client(char *ptr, size_t size, size_t nmemb, void *userdata) {
    beast::error_code ec;
	
	// client socket
	tcp::socket * socket_ptr = static_cast<tcp::socket*>(userdata);
	
	ptr[size*nmemb] = 0;
	std::cerr << ptr << std::endl;
	
	
	// should send along this socket now...
	
    //http::response<http::file_body> res{
    //    std::piecewise_construct,
    //    std::make_tuple(ptr),
    //    std::make_tuple(http::status::ok, req.version())};
    //res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
    //res.set(http::field::content_type, mime_type(path));
    //res.content_length(size);
    //res.keep_alive(req.keep_alive());
    //send(std::move(res));


}



// Handles an HTTP server connection
void
do_session(
    tcp::socket& client_socket)
{
    bool close = false;
    beast::error_code ec;

    // This buffer is required to persist across reads
	http::request<http::string_body> req;
    beast::flat_buffer buffer;

	// The io_context is required for all I/O
	net::io_context ioc;

	// These objects perform our I/O
	tcp::resolver resolver(ioc);
	beast::tcp_stream search_server_stream(ioc);

	// Look up the domain name
	std::cerr << (SEARCH_API_ADDR) << std::endl;
	char * host_str = (char*)strchr(SEARCH_API_ADDR, '/');
	if ((*host_str == '/' && *++host_str == '/')) {
		char * trailing_slash_ptr = strchr(++host_str, '/'); 
		if (trailing_slash_ptr != nullptr) {
			*trailing_slash_ptr = '\0';
		}
	}
	
	std::cerr << host_str << std::endl << std::flush;
	auto const results = resolver.resolve(host_str, "80");
	// Read a request
	http::read(client_socket, buffer, req, ec);
	if(ec == http::error::end_of_stream)
		return;
	if(ec)
		return fail(ec, "read");

    // XXX Need to make this SSL
	// pass on to the real search server...
	http::write(search_server_stream, req, ec);
	if (ec) {
		std::cerr << "Error writing with HTTP to HTTPS port.  Duh" << std::endl;
		return fail(ec, "write");
	}
	

	// Declare a container to hold the response
	http::response<http::dynamic_body> res;

    // XXX Need to make this SSL
	// Receive the HTTP response
	http::read(search_server_stream, buffer, res, ec);

	if (ec) {
		std::cerr << "Error reading server response..." << std::endl;
		return fail(ec, "read");
	}
	// Write the message to standard err
	std::cerr << res << std::endl;
	
		  
	if(ec)
		return fail(ec, "write");
	if(close)
	{
		// This means we should close the connection, usually because
		// the response indicated the "Connection: close" semantic.
		return;
	}
    

    // Send a TCP shutdown
    client_socket.shutdown(tcp::socket::shutdown_send, ec);
    // At this point the connection is closed gracefully
}
//------------------------------------------------------------------------------
using namespace std;
int main(int argc, char* argv[])
{
	char buffer[2020];
	struct curl_slist *headers = NULL;
    
	if (SEARCH_API_ADDR == nullptr) {
		keep_looping = false;
		std::cerr << "SEARCH_API_ADDR not set\n"; 
	}
	if (SEARCH_API_SECRET == nullptr) {
		keep_looping = false;	
		std::cerr << "SEARCH_API_SECRET not set\n";
	}
	
	init_signal_names();
	// Block hangup signal for this process
	signal(SIGHUP, report_and_continue);
	
	curl = curl_easy_init();
	curl_easy_setopt(curl, CURLOPT_URL, SEARCH_API_ADDR);
	headers = curl_slist_append(headers, strncat(strcpy(buffer,"Authorization: "), SEARCH_API_SECRET, 2019));
	headers = curl_slist_append(headers, "Content-Type: application/json");
	headers = curl_slist_append(headers, "Path: /search");
	curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
	curl_easy_setopt(curl, CURLOPT_POST, 1);
	curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_to_client);
	
    try
    {
        // Check command line arguments.
        if (argc != 2)
        {
            std::cerr <<
                "Usage: relay <receive-port>\n" <<
                "Example:\n" <<
                "    http-relay 8080\n";
            return EXIT_FAILURE;
        }
        auto const receive_address = net::ip::make_address("127.0.0.1");
        const unsigned short receive_port = static_cast<unsigned short>(std::atoi(argv[1]));
        

        // The io_context is required for all I/O
        net::io_context ioc{1};

        // The acceptor receives incoming connections
        tcp::acceptor acceptor{ioc, {receive_address, receive_port}};
        for(;keep_looping;)
        {
            // This will receive the new connection
            tcp::socket socket{ioc};

            // Block until we get a connection
            acceptor.accept(socket);

            // Launch the session, transferring ownership of the socket
            do_session(socket);
        }
    }
    catch (const std::exception& e)
    {
        std::cerr << "Error: " << e.what() << std::endl;
        return EXIT_FAILURE;
    }
}