#/bin/bash

find ./src ./test -name '*.ts' -exec clang-format --style=google -i {} +
