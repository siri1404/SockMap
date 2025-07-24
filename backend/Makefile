CC=gcc
CFLAGS=-Wall -Wextra -std=c99 -O2 -D_GNU_SOURCE
SRCDIR=src
INCDIR=include
BINDIR=bin
OBJDIR=obj

# Create directories if they don't exist
$(shell mkdir -p $(OBJDIR) $(BINDIR))

# Source files
SOURCES=$(SRCDIR)/sockmap.c $(SRCDIR)/socket_scan.c $(SRCDIR)/memory_map.c $(SRCDIR)/process_info.c
OBJECTS=$(SOURCES:$(SRCDIR)/%.c=$(OBJDIR)/%.o)
TARGET=$(BINDIR)/sockmap

# Include directories
INCLUDES=-I$(INCDIR)

# Libraries (add -lpthread if needed for threading)
LIBS=

.PHONY: all clean install

all: $(TARGET)

$(TARGET): $(OBJECTS)
	$(CC) $(OBJECTS) -o $@ $(LIBS)

$(OBJDIR)/%.o: $(SRCDIR)/%.c
	$(CC) $(CFLAGS) $(INCLUDES) -c $< -o $@

clean:
	rm -rf $(OBJDIR) $(BINDIR)

install: $(TARGET)
	sudo cp $(TARGET) /usr/local/bin/

# Development helpers
debug: CFLAGS += -g -DDEBUG
debug: $(TARGET)

test: $(TARGET)
	./$(TARGET) --test

.PHONY: help
help:
	@echo "Available targets:"
	@echo "  all     - Build the sockmap binary"
	@echo "  clean   - Remove build artifacts"
	@echo "  debug   - Build with debug symbols"
	@echo "  test    - Run basic tests"
	@echo "  install - Install to /usr/local/bin"