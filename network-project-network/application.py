import time
from flask import Flask, render_template, request, redirect, url_for, flash
from flask_login import LoginManager, login_user, current_user, logout_user
from flask_socketio import SocketIO, join_room, leave_room, send
from engineio.async_drivers import gevent
from wtform_fields import *
from models import *

# Configure app
app = Flask(__name__)
app.secret_key="b'f\xfa\x8b{X\x8b\x9eM\x83l\x19\xad\x84\x08\xaa"
app.config['WTF_CSRF_SECRET_KEY'] = "b'f\xfa\x8b{X\x8b\x9eM\x83l\x19\xad\x84\x08\xaa"

# Configure database
app.config['SQLALCHEMY_DATABASE_URI']="postgresql://ziryfoydgrifcw:d0533e76cf18f7cc7f2efef6409249ade82544a143a59f00d92ebcc81eb714f6@ec2-52-23-45-36.compute-1.amazonaws.com:5432/d7mktqve7701a4"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Initialize login manager
login = LoginManager(app)
login.init_app(app)

@login.user_loader
def load_user(id):
    try:
        return User.query.get(int(id))
    except:
        pass
#socketio = SocketIO(app, manage_session=False) # Deploy ederken bunu kullan
socketio = SocketIO(app, async_mode="eventlet") # Localde calistirirken bunu kullan


# Predefined rooms for chat
ROOMS = ["lounge", "private","Publichistory","Privatehistory"]

# Python flask part
@app.route("/", methods=['GET', 'POST'])
def index():
    reg_form = RegistrationForm()
    try:
        # Update database if validation success
        if reg_form.validate_on_submit():
            username = reg_form.username.data
            password = reg_form.password.data

            # Hash password
            hashed_pswd = pbkdf2_sha256.hash(password)

            # Add username & hashed password to DB
            user = User(username=username, hashed_pswd=hashed_pswd)
            db.session.add(user)
            db.session.commit()

            
            flash('Registered successfully. Please login.', 'success')
            return redirect(url_for('login'))
    except:
        pass
    return render_template("index.html", form=reg_form)

@app.route("/login", methods=['GET', 'POST'])
def login():
    login_form = LoginForm()
    # Allow login if validation success
    try:
        if login_form.validate_on_submit():
            user_object = User.query.filter_by(username=login_form.username.data).first()
            login_user(user_object)
            return redirect(url_for('chat'))
    except:
        pass
    return render_template("login.html", form=login_form)

@app.route("/logout", methods=['GET'])
def logout():
    # Logout user
    logout_user()
    flash('You have logged out successfully', 'success')
    return redirect(url_for('login'))

@app.route("/chat", methods=['GET', 'POST'])
def chat():
    try:
        if not current_user.is_authenticated: # Login olmadan giris yaparsan bu adrese login sayfasina atar
            flash('Please login', 'danger')
            return redirect(url_for('login'))
    except:
        pass
    try:
        users = db.Table("users",db.metadata, autoload=True, autoload_with=db.engine)
        results = db.session.query(users).all()
        total_list=[]
        for r in results:
            total_list.append(r.username) ## Getting usernames from database as array
        return render_template("chat.html", username=current_user.username, rooms=ROOMS, total_list=total_list)
    except:
        return render_template("chat.html", username=current_user.username, rooms=ROOMS)
    

# Socket IO part
@app.errorhandler(404)
def page_not_found(e):
    # note that we set the 404 status explicitly
    return render_template('404.html'), 404

@socketio.on('incoming-msg')
def on_message(data):
    """Broadcast messages"""
    msg = data["msg"] # Gonderilen mesaj1  burdan database kaydedebiliriz.
    username = data["username"]
    room = data["room"]
    toWho2=data["toWho"]
    # Mesajlari database'e kaydet
    if(room=="Lounge"): # For public messages
        try:
            message = PublicMessage(username=username, message=msg)
            db.session.add(message)
            db.session.commit()
        except:
            pass
    elif(room=="Private"): # For private messages
        try:
            message = PrivateMessage(username=username,toWho=toWho2 ,message=msg)
            db.session.add(message)
            db.session.commit()
        except:
            pass
    
    # Set timestamp
    time_stamp = time.strftime('%b-%d %I:%M%p', time.localtime())
    send({"username": username, "msg": msg, "time_stamp": time_stamp,"toWho":toWho2}, room=room)

online_users=[]
@socketio.on('join')
def on_join(data):
    """User joins a room"""
    global online_users
    username = data["username"]
    room = data["room"]
    join_room(room)
    joining="1"
    PublicMessages=[]
    PublicUsers=[]
    PrivateMessages=[]
    PrivateUsers=[] 
    toWhoList=[]
    if(room=="Lounge"): # show online users only in lounge room
        online_users.append(data["username"])
        online_users = list(dict.fromkeys(online_users))
    
    # Public messages
    if((username=="admin") & (room=="Publichistory")):
        try:
            public_messages = db.Table("PublicMessages",db.metadata, autoload=True, autoload_with=db.engine)
            results = db.session.query(public_messages).all() 
        except:
            pass
        # For Messages
        for r in results:
            PublicMessages.append(r.message) ## Getting public messages from database as an array
            PublicUsers.append(r.username) ## Getting public messages from database as an array

    # Private messages
    elif((username=="admin") & (room=="Privatehistory")):
        try:
            private_messages = db.Table("PrivateMessages",db.metadata, autoload=True, autoload_with=db.engine)
            results= db.session.query(private_messages).all()
        except:
            pass
        # For Messages
        for r in results:
            PrivateMessages.append(r.message) # Getting private messages from database as an array
            PrivateUsers.append(r.username) # Getting private sender from database as an array
            toWhoList.append(r.toWho) # Getting reciever information from database as an array
    # Broadcast that new user has joined
    send({"msg": username + " has joined the " + room + " room.","usr":username,"online_users":online_users,"joining":joining,"PublicMessages":PublicMessages,"PublicUsers":PublicUsers,"PrivateMessages":PrivateMessages,"PrivateUsers":PrivateUsers,"toWhoList":toWhoList}, room=room)

@socketio.on('leave')
def on_leave(data):
    """User leaves a room"""
    global online_users
    username = data['username']
    room = data['room']
    leave_room(room)
    joining="1"
    try:
        online_users.remove(username)
    except :
        pass
    send({"msg": username + " has left the room","online_users":online_users,"joining":joining}, room=room)

# Deploy ederken burayi degistir !!!!
if __name__ == "__main__":
    #app.run(debug=False) # Deployda bunu kullan
    socketio.run(app, debug=True) # Local