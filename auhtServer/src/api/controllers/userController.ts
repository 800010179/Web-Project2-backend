import {Request, Response, NextFunction} from 'express';
import CustomError from '../../classes/CustomError';
import {OutputUser, User} from '../../interfaces/User';
import {validationResult} from 'express-validator';
import userModel from '../models/userModel';
import bcrypt from 'bcrypt';
import DBMessageResponse from '../../interfaces/DBMessageResponse';
import LoginMessageResponse from '../../interfaces/LoginMessageResponse';
const salt = bcrypt.genSaltSync(12);

const userPost = async (
  req: Request<{}, {}, User>,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('Userpost auth');
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const messages = errors
        .array()
        .map((error) => `${error.msg}: ${error.param}`)
        .join(', ');
      next(new CustomError(messages, 400));
      return;
    }

    const user = req.body;
    user.password = await bcrypt.hash(user.password, salt);

    const newUser = await userModel.create(user);
    const response: DBMessageResponse = {
      message: 'User created',
      data: {
        username: newUser.username,
        email: newUser.email,
        id: newUser._id,
      },
    };

    res.json(response);
  } catch (error) {
    next(new CustomError('User creation failed', 500));
  }
};

const userListGet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('userListGet');
    const users = await userModel.find().select('-password -__v');
    const response: DBMessageResponse = {
      message: 'Users found',
      data: users,
    };
    res.json(response);
  } catch (error) {
    next(new CustomError('User list retrieval failed', 500));
  }
};

const userGet = async (
  req: Request<{id: string}, {}, {}>,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('userGet');

    const user = await userModel
      .findById(req.params.id)
      .select('-password -__v');
    if (!user) {
      next(new CustomError('User not found', 404));
      return;
    }

    const response: DBMessageResponse = {
      message: 'User found',
      data: user,
    };
    res.json(response);
  } catch (error) {
    next(new CustomError('User retrieval failed', 500));
  }
};

const userPut = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userFromToken: OutputUser = res.locals.user as OutputUser;
    const userId = userFromToken.id;

    const user: User = req.body as User;
    if (user.password) {
      user.password = await bcrypt.hash(user.password, salt);
    }

    const result: User = (await userModel
      .findByIdAndUpdate(userId, user, {new: true})
      .select('-password -role')) as User;

    if (!result) {
      next(new CustomError('User not found', 404));
      return;
    }

    const response: LoginMessageResponse = {
      message: 'User updated',
      user: {
        username: result.username,
        email: result.email,
        id: result._id,
      },
    };

    res.json(response);
  } catch (error) {
    next(new CustomError((error as Error).message, 500));
  }
};

const userDelete = async (
  req: Request,
  res: Response<{}, {user: OutputUser}>,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const result: User = (await userModel.findByIdAndDelete(user.id)) as User;
    if (!result) {
      next(new CustomError('User not found', 404));
      return;
    }

    const response: LoginMessageResponse = {
      message: 'User deleted',
      user: {
        username: result.username,
        email: result.email,
        id: result._id,
      },
    };

    res.json(response);
  } catch (error) {
    next(new CustomError('User deletion failed', 500));
  }
};

export {userPost, userListGet, userGet, userPut, userDelete};
