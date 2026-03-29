import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRepository } from '../../repositories/user-repository.interface.js';

export interface SwitchShopRequest {
  userId: number;
  shopId: number;
}

export class SwitchShop {
  constructor(private userRepository: UserRepository) {}

  async execute(request: SwitchShopRequest) {
    const { userId, shopId } = request;

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update shop_id in database
    await this.userRepository.updateShopId(userId, shopId);

    // Generate new token with updated shop_id
    const options: SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any
    };

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, barber_id: user.barber_id, shop_id: shopId },
      process.env.JWT_SECRET || 'secret',
      options
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        barber_id: user.barber_id,
        shop_id: shopId
      }
    };
  }
}
