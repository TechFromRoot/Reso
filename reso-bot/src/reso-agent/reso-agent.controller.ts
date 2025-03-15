import { Body, Controller, Post } from '@nestjs/common';
import { ResoAgentService } from './reso-agent.service';

@Controller('reso-agent')
export class ResoAgentController {
    constructor(private readonly resoService: ResoAgentService) { }

    @Post()
    quote(@Body() payload: { prompt: string }) {
        const privateKey =
            '';
        return this.resoService.swapToken(
            privateKey,
            payload.prompt
        );
    }
}