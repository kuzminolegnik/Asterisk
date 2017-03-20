var Connect = require('asterisk-ami');

var ami = new Connect({
    host: 'sip.bpfcom.net',
    port: '5038',
    // debug: true,
    username: 'crminside',
    password: 'hyIU9n5sjeWqhxq9d6M7'
});

var lastChannel;

ami.on('ami_data', function(data){
    if (data["event"] == "RTCPReceived" || data["event"] == "RTCPSent") {
        return;
    }
    console.log(data)
});

ami.on('ami_socket_error', function(error) {
    console.error(error);
});

ami.connect(function() {
    ami.send({
        action: 'CoreShowChannels'
    });
});

// Newchannel
// Newstate
// DeviceStateChange
// Newexten
// Newexten
// Newexten
// Newexten
// Newexten
// Newexten
// Newexten
// Newexten
// Newexten
// Newexten
// Newexten
// Newexten
// Newexten
// Newexten
// Newexten
// Newchannel
// Newexten
// NewConnectedLine
// DeviceStateChange
// DialBegin
// NewConnectedLine
// Newstate
// HangupRequest
// DeviceStateChange
// DialEnd
// DeviceStateChange
// Hangup
// SoftHangupRequest
// Hangup

