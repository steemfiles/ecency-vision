#!/bin/sh
git log | head -3 | sed 's|$|\\\\n\"\\n|g' | sed 's|^|\"|' >  /tmp/x.txt
echo 'const char * raw_version = '`cat /tmp/x.txt`';' |  clang-format-12  > raw_version.cpp  
rm /tmp/x.txt