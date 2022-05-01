#ifndef AbstractService_h
#define AbstractService_h AbstractService_h
#include "pidfile.hpp"
#include <boost/asio/connect.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/http/buffer_body.hpp>
#include <boost/beast/http/parser.hpp>
#include <boost/beast/version.hpp>
#include <boost/process.hpp>
#include <boost/thread.hpp>
#include <cstdlib>
#include <functional>
#include <iostream>
#include <map>
#include <memory>
#include <set>
#include <signal.h>
#include <string>
#include <sys/time.h>
#include <unistd.h>
#include <utility>
bool connect_to_http_server(const char *, const char *, const char *);

namespace beast = boost::beast; // from <boost/beast.hpp>
namespace http = beast::http;   // from <boost/beast/http.hpp>
namespace net = boost::asio;    // from <boost/asio.hpp>
using tcp = net::ip::tcp;       // from <boost/asio/ip/tcp.hpp>
using namespace boost::process;
using namespace std;

class AbstractService {
protected:
  void validate() const;
  void init();
  void destroy();
  virtual const char *port() const;
  virtual const char *target() const;
  std::string service_name;
  std::string base_name;
  std::string interpreter;
  std::string program;
  std::string programLog;
  child *child_ptr;
  ofstream *lout_ptr;
  boost::thread *log_forward_thread_ptr;
  boost::thread *server_minding_thread_ptr;
  pidfile *pid_ptr;
  ipstream *pipe_stream_ptr;
  bool mindingFlag;
  bool _stopped;
  virtual void mind_server();

public:
  bool isGood() const;
  virtual bool connect() const;
  std::string getPIDFilename() const;
  std::string serviceName() const;
  bool running() const;
  void onClosed();
  void close();
  void start();
  void stop();
  virtual const char *programFile() const;
  void reStart();
  AbstractService(const char *name, const char *basename_p,
                  const char *interpreter_p, const char *program_p);
  virtual ~AbstractService();
};
set<AbstractService *> &operator<<(set<AbstractService *> &s,
                                   const AbstractService *p);
extern set<AbstractService *> down;
extern bool all_running, keep_looping;
extern std::string fault;

class PrivateAPIService : public AbstractService {
protected:
  const char *port() const override;
  const char *target() const override;

public:
  PrivateAPIService();
  virtual bool connect() const override;
};

#endif