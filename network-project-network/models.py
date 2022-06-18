from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()


class User(UserMixin, db.Model):
    """ User model """

    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(25), unique=True, nullable=False)
    hashed_pswd = db.Column(db.String(), nullable=False)
    
class PublicMessage(UserMixin, db.Model):
    """ Public Message model """

    __tablename__= "PublicMessages"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(25), nullable=False)
    message = db.Column(db.String(2000), nullable=False)

class PrivateMessage(UserMixin, db.Model):
    """ Private Message model """

    __tablename__= "PrivateMessages"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(25), nullable=False)
    toWho = db.Column(db.String(25), nullable=False)
    message = db.Column(db.String(2000), nullable=False)
