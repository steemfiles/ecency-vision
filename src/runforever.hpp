#ifndef runforever_hpp
#define runforever_hpp runforever_hpp
#include <boost/process.hpp>
#include <boost/thread.hpp>
#include <iostream>
extern bool verbose_threads;
extern bool verbose;
extern std::string fault;
extern std::ostream &mainserverlogline();
#include "abstractservice.hpp"
extern std::set<AbstractService *> down;
void forward_log(boost::process::ipstream &ps, std::ostream &log,
                 const boost::process::child *cptr);
std::set<AbstractService *> &operator<<(std::set<AbstractService *> &s,
                                        const AbstractService *p);
extern const char *RUNFOREVER_MANAGER_VERSION_STRING;
#endif