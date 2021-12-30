#!/bin/sh
echo '#include <string>\nconst char * raw_version = "'`git log | head -3`'";' > raw_version.cpp 
