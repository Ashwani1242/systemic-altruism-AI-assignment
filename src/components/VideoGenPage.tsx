import { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

function VideoGenPage() {
    const [prompt, setPrompt] = useState<string>('');
    const [theme, setTheme] = useState<string>('fantasy');
    const [tone, setTone] = useState<string>('sarcastic');
    const [ageGroup, setAgeGroup] = useState<string>('kids (5 - 12)');
    const [duration, setDuration] = useState<string>('50');
    const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
    const [generatedScript, setGeneratedScript] = useState<string>('Enter a prompt to generate a Script');
    const [error, setError] = useState<string>('');
    const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [isFetchingVideo, setIsFetchingVideo] = useState<boolean>(false);

    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    useEffect(() => {
        if (generatedPrompt) {
            console.log(generatedPrompt);
        }
    }, [generatedPrompt]);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt.');
            return;
        }

        setError('');

        const result = `You are a professional storyteller. Write a creative, engaging, and concise comedy story of about ${duration} words. The story should be told in a natural, flowing style, without any formatting elements, such as hashtags, character names, stage directions, or script cues. The text should read like a story written for an audience, not a script or screenplay. Keep the tone light and ${tone}, suitable for specific audience as ${ageGroup}, the theme of the story will be ${theme} and make sure the narrative is entertaining from start to finish. The topic of the story will be: ${prompt}`;

        setGeneratedPrompt(result);

        try {
            setIsGeneratingScript(true);
            const response = await model.generateContent(result);
            const script = response.response.text();
            setGeneratedScript(script);

            await generateVideo(script);
        } catch (error) {
            console.error('Error generating script:', error);
            setError('Failed to generate script. Please try again.');
        } finally {
            setIsGeneratingScript(false);
        }
    };

    const generateVideo = async (script: string) => {
        setIsGeneratingVideo(true);
        setIsGeneratingScript(false);

        const options = {
            method: 'POST',
            url: 'https://api.d-id.com/talks',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                authorization: `Bearer ${import.meta.env.VITE_DID_AUTH}`,
            },
            data: {
                source_url: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg',
                script: {
                    type: 'text',
                    subtitles: 'false',
                    provider: { type: 'microsoft', voice_id: 'Sara' },
                    input: script,
                },
                config: { fluent: 'false', pad_audio: '0.0' },
            },
        };

        try {
            const response = await axios.request(options);
            const video_Id = response.data.id;

            console.log('API Response:', response.data);

            if (!video_Id) {
                console.error('Invalid video ID received:', video_Id);
                setError('Failed to retrieve video ID.');
                return;
            }

            console.log('Video ID:', video_Id);
            fetchVideo(video_Id);
        } catch (error) {
            console.error('Error generating video:', error);
            setError('Failed to generate video. Please try again.');
        } finally {
            setIsGeneratingVideo(false);
        }
    };

    const fetchVideo = async (videoId: string) => {
        setIsFetchingVideo(true);
        // setIsGeneratingVideo(false)
        const MAX_ATTEMPTS = 10;
        const POLLING_INTERVAL = 5000;
        let attempts = 0;

        const checkVideoStatus = async () => {
            if (attempts >= MAX_ATTEMPTS) {
                setError('Failed to fetch video. Please try again later.');
                setIsFetchingVideo(false);
                return;
            }

            attempts++;
            const options = {
                method: 'GET',
                url: `https://api.d-id.com/talks/${videoId}`,
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${import.meta.env.VITE_DID_AUTH}`,
                },
            };

            try {
                const response = await axios.request(options);
                console.log('GET Response:', response.data);

                const resultUrl = response.data.result_url;

                if (!resultUrl) {
                    console.log('Result URL not ready yet, retrying...');
                    setTimeout(checkVideoStatus, POLLING_INTERVAL);
                    return;
                }

                setVideoUrl(resultUrl);
                console.log('Result URL:', resultUrl);
                setIsFetchingVideo(false);
            } catch (error) {
                console.error('Error fetching video:', error);
                setError('Failed to fetch video. Please try again.');
                setIsFetchingVideo(false);
            }
        };

        checkVideoStatus();
    };

    return (
        <div className="flex flex-col justify-center items-center h-screen w-screen py-16 px-40">
            <div className='text-5xl uppercase font-bold bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent pb-4'>
                Interdimensional Comedy
            </div>
            <div className='flex justify-center items-center h-full w-full border-2 border-neutral-400 rounded-3xl bg-neutral-100/10'>
                <div className="flex-1 flex flex-col justify-center items-center space-y-4">
                    <div className='w-3/4 h-[100px] relative'>
                        {error && <p className="text-red-500 absolute -top-8">{error}</p>}
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Enter your prompt"
                            className="border p-2 h-full w-full resize-none"
                            required />
                    </div>

                    <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="border p-2 w-3/4">
                        <option value="fantasy">Fantasy</option>
                        <option value="science fiction">Science Fiction</option>
                        <option value="fairy tale">Fairy Tale</option>
                        <option value="slice of life">Slice Of Life</option>
                    </select>

                    <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        className="border p-2 w-3/4">
                        <option value="sarcastic">Sarcastic</option>
                        <option value="hilarious">Hilarious</option>
                        <option value="silly">Silly</option>
                        <option value="dark comedy">Dark Comedy</option>
                    </select>

                    <select
                        value={ageGroup}
                        onChange={(e) => setAgeGroup(e.target.value)}
                        className="border p-2 w-3/4">
                        <option value="kids (5 - 12)">Kids (5 - 12)</option>
                        <option value="teens (13 - 18)">Teens (13 - 18)</option>
                        <option value="adults (18 - 35)">Adults (18 - 35)</option>
                    </select>
                    
                    <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="border p-2 w-3/4">
                        <option value="50">30 Seconds</option>
                        <option value="100">1 Minute</option>
                        <option value="150">1 Minute 30 Seconds</option>
                        <option value="200">2 Minutes</option>
                    </select>

                    <button
                        onClick={handleGenerate}
                        className="bg-blue-500 text-white p-2 rounded w-3/4"
                        disabled={isGeneratingScript || isGeneratingVideo}>
                        {isGeneratingScript ? 'Generating Script...' : isGeneratingVideo ? 'Generating Video...' : 'Generate'}
                    </button>

                    <p className="p-4 border mt-4 w-3/4 h-[200px] max-h-[200px] overflow-y-auto bg-black/50 text-gray-400">{generatedScript}</p>
                </div>
                <div className='py-40 h-full'> <div className='h-full w-[2px] bg-neutral-500' /> </div>
                <div className="flex-1 flex flex-col justify-center items-center h-full">
                    {videoUrl ? "" : "Your Video Here" }
                    {isFetchingVideo ? (
                        <p className="text-blue-500">Loading video...</p>
                    ) : (
                        videoUrl && (
                            <div className="p-4 border mt-4 gap-y-2">
                                <p>Video generated successfully!</p>
                                <video controls src={videoUrl} className="w-ful mt-2 mb-4" />
                                <a href={videoUrl} download className="bg-green-500 text-white p-2 rounded">
                                    Download Video
                                </a>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

export default VideoGenPage;
