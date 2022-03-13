import React from 'react'
import '../../../App.css';
import { Component } from 'react'
import axios from '../../../settings/axios';
import { withRouter } from 'react-router-dom';
import PoweredBy from '../../PoweredBy';
import EndBotChallenge from './EndBotChallenge';
import Countdown from "react-countdown";
import './BotTrivia.css';
import BotChallenge from './BotChallenge'
import security from '../../../settings/security';
import config from '../../../config';
import UseGtagEvent from '../../hooks/useGtagEvent';

export const BotQuestion = ({ question, image, indices, isLoading, renderCountdown, chooseAnswer }) => {
    return (
        <div className="bot-question connect-triva">
            <div className="trival-block">
                <div className="container quest">
                    <div className="countern text-center mt-2">
                        {renderCountdown && renderCountdown()}
                    </div>
                    <div className="questions">
                        <div className="head3 bold-text">
                            {question.question}
                        </div>
                        <p>{question.description}</p>
                    </div>
                    {image && (
                        <div>
                            <div className="media-c">
                                <img src={image.src} alt="question" className="drop-shadow img-b" />
                            </div>
                        </div>
                    )}
                    <div className="options">
                        {indices.map(index => (
                            <button className="btn btnChan text-left"
                                disabled={isLoading}
                                onClick={() => chooseAnswer(`option${index}`)}
                            >
                                {question[`option${index}`]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
};


class BotTrivia extends Component {
    constructor(props) {
        super(props);
        this.state = {
            currentQuestion: this.props.startingQuestion,
            token: this.props.token,
            answers: [],
            finishQuiz: false,
            result: 0,
            loaded: false,
            score: 0,
            totalTime: 0,
            allowedTime: 15,
            bufferCard: true,
            bufferTime: 3,
            option: '',
            returnObj: null,
            isLoading: true,
            image: null,
            quizStatus: 'PASSED',
            warning: { status: false, msg: '', type: '' },
            questionsAnswered: 0,
            questionIndices: [1,2,3,4]
        };

        this.updateAnswer = this.updateAnswer.bind(this);
        this.updateQuestion = this.updateQuestion.bind(this);
        this.chooseAnswer = this.chooseAnswer.bind(this);
        this.quizTimerChild = React.createRef();
        this.bufferTimerChild = React.createRef();
    }

    chooseAnswer = async (option) => {
        this.setState({
            isLoading: true
        })
        this.quizTimerChild.current.pause();
        await this.setState({
            option: option
        })
    }

    updateAnswer = async (timeLeft) => {
        let ans = ' '

        if (timeLeft > 0) {
            ans = this.state.option
        }

        const timePassed = (parseInt(this.state.allowedTime) - timeLeft).toFixed(2)

        const totalTime = parseFloat(this.state.totalTime)

        const newTotalTime = (totalTime + parseFloat(timePassed))

        await this.setState(() => ({
            totalTime: parseFloat((newTotalTime).toFixed(2)),
            isLoading: true
        }))

        this.state.questionsAnswered++;

        // let key = this.props.questions[this.state.currentQuestion].questionId;
        let key = this.state.currentQuestion.question_id;

        const payloadData = {
            answer: {
                answer: ans,
                questionId: key,
            },
            wallet: this.props.wallet.toBase58(),
            rpcUrl: this.props.endpoint,
            token: this.state.token,
            gatekeeperNetwork: this.props.gatekeeperNetwork.toBase58()
        };
        try {
            const returnObj = await axios.post(
                '/bot-questions/verify-human', payloadData);

            const decrypted = returnObj.data;
            if (decrypted["question"]) {
                this.state.token = decrypted.token;
                await this.updateQuestion(decrypted.question);
            } else {
                await this.setState(() => ({
                    finishQuiz: true,
                    returnObj: decrypted,
                    isLoading: false,
                    bufferCard: false
                }))

                UseGtagEvent('quiz_successful', 'Quiz Successful');
            }

        } catch (e) {
            console.error(e)
            UseGtagEvent('quiz_failed', 'Quiz Failed');

            await this.setState({
                quizStatus: 'FAILED'
            })

            this.setState({
                finishQuiz: true,
                isLoading: false
            })
        }
    }

    updateQuestion = async (question) => {
        let image = new Image();
        image.src = question.question_image

        const shuffleArray = array => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }

            return array
        }

        await this.setState(() => ({
            currentQuestion: question,
            bufferCard: true,
            isLoading: false,
            image: image,
            questionIndices: shuffleArray([1, 2, 3, 4])
        }));

        this.bufferTimerChild.current.start();
    }

    componentDidMount = async () => {
        this.bufferTimerChild.current.start();
    }

    renderCountdown = () => {
        return (
            <Countdown
                date={Date.now() + this.state.allowedTime * 1000}
                intervalDelay={2}
                precision={0}
                ref={this.quizTimerChild}
                controlled={false}
                autoStart={true}
                renderer={props =>
                    <div className="head5 text-left timer">
                        {this.state.isLoading && (
                            <>
                                Checking results for <span className="blue-text">Question {this.state.questionsAnswered + 1}</span>
                            </>
                        )}
                        {!this.state.isLoading && (
                            <>
                                <span className="blue-text">Question {this.state.questionsAnswered + 1}</span> with <span className="blue-text">{(props.total / 1000)} seconds</span> remaining
                            </>
                        )}
                    </div>
                }
                onPause={async (props) => this.updateAnswer((props.total / 1000).toFixed(2))}
                onComplete={async () => this.updateAnswer(0)}
            />
        );
    }

    render() {
        return (
            <div>
                {this.state.bufferCard && (
                    <div className="text-center bot-container pt-5 pb-4">
                        <Countdown
                            date={Date.now() + 3 * 1000}
                            ref={this.bufferTimerChild}
                            autoStart={false}
                            intervalDelay={0}
                            precision={0}
                            onComplete={async () => {
                                await this.setState({ bufferCard: false, isLoading: false });
                            }}
                            renderer={props =>
                                <>
                                    <div className="head3 bold-text">{this.state.questionsAnswered == 0 ? 'The challenge starts in' : 'Next question in'}: <div className="blue-text my-5 bold-text countdown-text">{props.total / 1000}</div></div>
                                </>
                            }
                        />
                        <PoweredBy />
                    </div>
                )}
                {!this.state.bufferCard && (
                    <div className="bot-container container pb-4">
                        {this.state.currentQuestion && !this.state.finishQuiz && (
                            <>
                                <BotQuestion question={this.state.currentQuestion}
                                    image={this.state.image}
                                    indices={this.state.questionIndices}
                                    isLoading={this.state.isLoading}
                                    renderCountdown={this.renderCountdown}
                                    chooseAnswer={this.chooseAnswer}
                                />
                                <PoweredBy />
                            </>
                        )}
                        {!this.state.isLoading && this.state.finishQuiz && this.state.quizStatus === 'PASSED' && (
                            <EndBotChallenge sendableTransaction={this.state.returnObj} />
                        )}
                    </div>

                )}
                {!this.state.bufferCard && !this.state.isLoading && this.state.finishQuiz && this.state.quizStatus === 'FAILED' && (
                    <BotChallenge endpoint={this.props.endpoint} gatekeeperNetwork={this.props.gatekeeperNetwork} failed={true} />
                )}
            </div>
        )
    }
}

export default withRouter(BotTrivia)