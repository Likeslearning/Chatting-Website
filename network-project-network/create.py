from flask import Flask
from models import *

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI']="postgresql://ziryfoydgrifcw:d0533e76cf18f7cc7f2efef6409249ade82544a143a59f00d92ebcc81eb714f6@ec2-52-23-45-36.compute-1.amazonaws.com:5432/d7mktqve7701a4"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS']=False

db.init_app(app)

def main():
    db.create_all()

if __name__ == "__main__":
    with app.app_context():
        main()
