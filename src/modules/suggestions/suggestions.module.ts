import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Suggestion, SuggestionSchema } from './schemas/suggestion.schema';
import { SuggestionVote, SuggestionVoteSchema } from './schemas/suggestion-vote.schema';
import { SuggestionComment, SuggestionCommentSchema } from './schemas/suggestion-comment.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { SuggestionsService } from './suggestions.service';
import { SuggestionsController } from './suggestions.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Suggestion.name, schema: SuggestionSchema },
      { name: SuggestionVote.name, schema: SuggestionVoteSchema },
      { name: SuggestionComment.name, schema: SuggestionCommentSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [SuggestionsController],
  providers: [SuggestionsService],
  exports: [SuggestionsService],
})
export class SuggestionsModule {}
