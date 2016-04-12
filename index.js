var util = require('util'),
    Transform = require('stream').Transform;

util.inherits(PeekStream, Transform);

function PeekStream(opts) {
    Transform.call(this);
    this.head = opts.head || 0;
    this.tail = opts.tail || 0;
    this.message = '...\n';

    if (opts.message || opts.message === null) {
        this.message = opts.message;
    }

    // if the message is not an array, convert it to one
    if (this.message !== null && typeof this.message !== 'object') {
        this.message = [this.message];
    }

    this.messageShown = false;
    this.lineNum = 0;
    this.tailWindow = [];
}

PeekStream.prototype._transform = function(data, encoding, callback) {
    this.lineNum++;

    // one of the first lines in the head range
    if (this.head && this.lineNum <= this.head) {
        this.push(data);

        // if there are no more lines to capture, signal the end of
        // the stream to avoid further processing
        if (this.lineNum == this.head && !this.tail) {
            this.push(null);
        }

        callback();
        return;
    }

    // show all the message lines
    if (this.head && this.tail && this.message !== null && !this.messageShown) {
        var _this = this;
        this.message.forEach(function(msgLine) {
            _this.push(msgLine);
        });
        this.messageShown = true;
    }

    // keep the last lines that might be the tail to show when the stream ends
    if (this.tail) {
        if (this.tailWindow.length >= this.tail) {
            this.tailWindow.shift();
        }

        this.tailWindow.push(data);
    }

    callback();
};

PeekStream.prototype._flush = function(callback) {
    var _this = this;
    // flush the tail lines when the stream has ended
    this.tailWindow.forEach(function(data) {
        _this.push(data);
    });
};

module.exports = function(head, tail) {
    var opts = {};

    // opts was provided as first arg
    if (typeof head === 'object') {
        opts = head;
    }
    // head and tail were provided as numbers
    else {
        if (head >= 0) {
            opts.head = head;
            opts.tail = tail;
        }
        // there's only a tail, provided as negative first arg
        else {
            opts.head = 0;
            opts.tail = -head;
        }
    }

    return new PeekStream(opts);
};
